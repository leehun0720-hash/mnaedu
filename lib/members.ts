import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { members, questions } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { isOfflineTrack } from "@/lib/questions";

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
 * 로그인한 회원의 프로필. 없으면 만들어 준다 — Supabase Auth로 가입은
 * 끝났는데 우리 쪽 행이 없는 상태(웹훅 유실 등)에서도 화면이 멎지 않도록.
 */
export async function getCurrentMember(): Promise<MemberProfile | null> {
  const user = await getAuthUser();
  if (!user || !isDbConfigured()) return null;

  const db = getDb();
  const [existing] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  if (existing) return toProfile(existing);

  const email = user.email ?? "";
  const name = (user.user_metadata?.name as string | undefined) ?? null;
  const [created] = await db
    .insert(members)
    .values({ authId: user.id, email, name })
    .onConflictDoNothing({ target: members.authId })
    .returning();

  if (created) return toProfile(created);

  // 동시 요청이 먼저 만들었다면 그것을 읽어 온다
  const [raced] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  return raced ? toProfile(raced) : null;
}

export function toProfile(row: typeof members.$inferSelect): MemberProfile {
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

  // 시크릿 오피스 분야는 블라인드 — 온라인 경로로는 나가지 않는다
  if (!question || isOfflineTrack(question.track)) return { ok: false, reason: "not-found" };
  if (!question.answer && !question.explanation) return { ok: false, reason: "not-found" };

  return {
    ok: true,
    answer: question.answer ?? "",
    explanation: question.explanation ?? "",
  };
}
