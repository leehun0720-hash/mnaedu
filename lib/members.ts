import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { members, questions } from "@/db/schema";
import { isRecruitTrack } from "@/lib/recruit";
import { getAuthUser } from "@/lib/supabase/server";
import { withDeadline } from "@/lib/deadline";

/**
 * 회원 표를 읽고 쓰는 데 허락하는 시간.
 *
 * 이 표가 잠기면(다른 접속이 ALTER 로 붙들고 있으면) 로그인한 분의 모든
 * 페이지가 여기서 멈춘다 — 공개 화면은 멀쩡한데 회원에게만 사이트가 죽은
 * 것처럼 보이는 상태다. 그래서 시한을 넘기면 '회원 아님'으로 물러난다.
 * 페이지는 뜨고, 정답 열람만 잠시 닫힌다. 멈추는 것보다 낫다.
 */
const MEMBER_DEADLINE_MS = 3_000;

/**
 * 회원 저장소.
 *
 * 등급도 포인트도 없다 — 로그인했으면 정답과 해설이 열리고, 아니면 닫힌다.
 * 판정 조건이 하나뿐이라 여기서 관리할 상태도 없다.
 */

/** 화면이 쓰는 회원 한 명의 모양 */
export type MemberProfile = {
  id: number;
  authId: string;
  email: string;
  name: string | null;
};

/**
 * 한 사람을 회원 명단에 올린다. 이미 있으면 그대로 돌려준다.
 *
 * 인증이 끝난 그 자리(/auth/callback)에서 부르는 것이 원칙이다. 예전에는
 * 이 일이 '로그인한 채로 공개 페이지를 한 번 열었을 때'에만 일어나서,
 * 메일 인증을 마치고도 명단에 오르지 않는 분이 생겼다 — 회장이 "회원은
 * 등록됐는데 회원 수가 0명"이라 하신 그 자리다.
 *
 * 저장소가 흔들려도 홈페이지가 멎지는 않게, 실패는 null로 돌린다.
 */
export async function recordMember(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<MemberProfile | null> {
  if (!isDbConfigured()) return null;
  return withDeadline(recordNow(user), MEMBER_DEADLINE_MS, null, "member record");
}

async function recordNow(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<MemberProfile | null> {
  try {
    const db = getDb();
    // 필요한 열만 고른다. select() 로 전부 긁으면, 나중에 더한 열이 아직
    // 데이터베이스에 없을 때 공개 화면의 로그인 상태까지 함께 무너진다.
    const db_ = db.select(PROFILE_COLUMNS).from(members);
    const [existing] = await db_.where(eq(members.authId, user.id)).limit(1);
    if (existing) return toProfile(existing);

    const email = user.email ?? "";
    const name = (user.user_metadata?.name as string | undefined) ?? null;
    const [created] = await db
      .insert(members)
      .values({ authId: user.id, email, name })
      .onConflictDoNothing({ target: members.authId })
      .returning(PROFILE_COLUMNS);

    if (created) return toProfile(created);

    // 동시 요청이 먼저 만들었다면 그것을 읽어 온다
    const [raced] = await db
      .select(PROFILE_COLUMNS)
      .from(members)
      .where(eq(members.authId, user.id))
      .limit(1);
    return raced ? toProfile(raced) : null;
  } catch (err) {
    // 명단에 못 올리더라도 들어오신 분을 문밖에 세우지는 않는다
    console.error("[members] record failed:", err);
    return null;
  }
}

/**
 * 로그인한 회원의 프로필. 없으면 만들어 준다 — 인증 직후 기록이 어떤 이유로
 * 빠졌더라도(연결 실패 등) 다음 방문에서 다시 시도한다.
 */
export async function getCurrentMember(): Promise<MemberProfile | null> {
  const user = await getAuthUser();
  if (!user) return null;
  return recordMember(user);
}

/** 화면이 쓰는 열만 — 메모처럼 나중에 더한 열에 공개 경로가 기대지 않게 한다 */
const PROFILE_COLUMNS = {
  id: members.id,
  authId: members.authId,
  email: members.email,
  name: members.name,
} as const;

export function toProfile(row: MemberProfile): MemberProfile {
  return { id: row.id, authId: row.authId, email: row.email, name: row.name };
}

export type RevealResult =
  | { ok: true; answer: string; explanation: string }
  | { ok: false; reason: "no-db" | "not-member" | "not-found" };

/**
 * 정답과 해설 열람 — 이 둘이 서버 밖으로 나가는 유일한 경로.
 *
 * 공개 페이지 데이터에는 절대 실리지 않는다(불변 원칙). 조건은 로그인
 * 하나다 — 차감할 포인트도, 확인할 등급도, 먼저 풀어야 할 문제도 없다.
 */
export async function revealAnswer(questionId: number): Promise<RevealResult> {
  if (!isDbConfigured()) return { ok: false, reason: "no-db" };
  const member = await getCurrentMember();
  if (!member) return { ok: false, reason: "not-member" };

  const db = getDb();
  const [question] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.published, true)))
    .limit(1);

  // 발행하지 않은 문제는 위 조건에서 이미 걸러진다
  if (!question) return { ok: false, reason: "not-found" };
  /**
   * 채용 문제의 정답은 회원에게도 열지 않는다.
   *
   * 업무 문제의 정답은 회원에게 여는 것이 목적이지만, 채용 문제는 그 자체가
   * 시험이다. 정답이 먼저 도는 순간 시험이 아니게 된다 — 로그인만 하면
   * 답을 받아 가는 길을 열어 두면 채용 전형이 통째로 무의미해진다.
   */
  if (isRecruitTrack(question.track)) return { ok: false, reason: "not-found" };
  if (!question.answer && !question.explanation) return { ok: false, reason: "not-found" };

  return {
    ok: true,
    answer: question.answer ?? "",
    explanation: question.explanation ?? "",
  };
}
