import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { answers, members, pointLedger, questions, unlockedExplanations } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { POINTS, canAccessLevel, type Tier } from "@/lib/membership";
import { isPaidNow } from "@/lib/billing";
import { isOfflineTrack } from "@/lib/questions";

/**
 * 회원 저장소 — 프로필 조회·생성과 포인트 차감.
 * 등급 규칙 자체는 lib/membership.ts에 있고 여기서는 그것을 적용만 한다.
 */
export { POINTS, levelsFor, canAccessLevel, type Tier } from "@/lib/membership";

/** 화면이 쓰는 회원 한 명의 모양 */
export type MemberProfile = {
  id: number;
  authId: string;
  email: string;
  name: string | null;
  /**
   * 지금 실제로 유효한 등급. 구독이 만료된 계정은 저장된 값이 paid여도
   * free로 내려온다 — 권한 판정이 전부 이 값을 보므로, 만료 처리를 각
   * 화면이 따로 기억할 필요가 없다.
   */
  tier: Tier;
  /** 저장된 등급 (만료 여부와 무관) — 관리자 화면에서 구분해 보여 준다 */
  storedTier: Tier;
  /** 구독 만료 시각. null이면 기한 없음 */
  paidUntil: Date | null;
  points: number;
  clearedLevel: number;
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
    .values({ authId: user.id, email, name, points: POINTS.onJoin })
    .onConflictDoNothing({ target: members.authId })
    .returning();

  if (created) {
    await db.insert(pointLedger).values({
      memberId: created.id,
      kind: "earn",
      amount: POINTS.onJoin,
      reason: "join",
    });
    return toProfile(created);
  }

  // 동시 요청이 먼저 만들었다면 그것을 읽어 온다
  const [raced] = await db.select().from(members).where(eq(members.authId, user.id)).limit(1);
  return raced ? toProfile(raced) : null;
}

export function toProfile(row: typeof members.$inferSelect): MemberProfile {
  const stored: Tier = row.tier === "paid" ? "paid" : "free";
  return {
    id: row.id,
    authId: row.authId,
    email: row.email,
    name: row.name,
    tier: isPaidNow(stored, row.paidUntil) ? "paid" : "free",
    storedTier: stored,
    paidUntil: row.paidUntil ?? null,
    points: row.points,
    clearedLevel: row.clearedLevel,
  };
}

export type UnlockResult =
  | { ok: true; explanation: string; pointsLeft: number; alreadyOpen: boolean }
  | {
      ok: false;
      reason: "no-db" | "not-member" | "not-found" | "locked-level" | "free-tier" | "not-answered" | "not-enough-points";
    };

/**
 * 해설 열람.
 *
 * 정답·해설은 공개 데이터에서 원천 배제되므로(불변 원칙) 오직 이 경로로만
 * 나간다. 이미 연 해설은 다시 차감하지 않는다.
 */
export async function unlockExplanation(questionId: number): Promise<UnlockResult> {
  if (!isDbConfigured()) return { ok: false, reason: "no-db" };
  const member = await getCurrentMember();
  if (!member) return { ok: false, reason: "not-member" };

  const db = getDb();
  const [question] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.published, true)))
    .limit(1);
  // 시크릿 오피스 분야는 블라인드 — 해설도 온라인 경로로는 나가지 않는다
  if (!question || !question.explanation || isOfflineTrack(question.track)) return { ok: false, reason: "not-found" };
  if (!canAccessLevel(member.tier, question.level)) return { ok: false, reason: "locked-level" };
  // 해설 열람은 유료회원 전용 — 무료회원에게는 모자이크 미리보기만 보인다
  if (member.tier !== "paid") return { ok: false, reason: "free-tier" };
  // 풀지 않은 문제의 해설은 열리지 않는다 — 해설은 풀이의 보상이다
  const [attempted] = await db
    .select({ id: answers.id })
    .from(answers)
    .where(and(eq(answers.memberId, member.id), eq(answers.questionId, questionId)))
    .limit(1);
  if (!attempted) return { ok: false, reason: "not-answered" };

  if (member.points < POINTS.perExplanation) return { ok: false, reason: "not-enough-points" };

  /**
   * 열람 기록을 먼저 잡고, 그 자리를 얻은 요청만 차감한다.
   *
   * 조회 후 차감 순서로 두면 같은 문제로 동시에 두 번 들어온 요청이 둘 다
   * '아직 안 열림'을 보고 각각 30P씩 차감한 뒤, 뒤늦게 유니크 제약에 걸려
   * 한쪽이 터진다 — 60P가 빠졌는데 원장에는 30P만 남는다. (member, question)
   * 유니크 인덱스를 경합의 심판으로 쓰면 그 창이 아예 없어진다.
   */
  const [claim] = await db
    .insert(unlockedExplanations)
    .values({ memberId: member.id, questionId })
    .onConflictDoNothing({
      target: [unlockedExplanations.memberId, unlockedExplanations.questionId],
    })
    .returning();

  if (!claim) {
    // 이미 연 해설 — 다시 차감하지 않는다
    return { ok: true, explanation: question.explanation, pointsLeft: member.points, alreadyOpen: true };
  }

  // 잔액을 읽고 쓰는 사이에 다른 요청이 끼어들 수 있으므로, 차감은 조건을
  // 건 UPDATE 한 번으로 처리한다 — 포인트가 모자라면 아무 행도 바뀌지 않는다.
  const [charged] = await db
    .update(members)
    .set({ points: sql`${members.points} - ${POINTS.perExplanation}`, updatedAt: new Date() })
    .where(and(eq(members.id, member.id), sql`${members.points} >= ${POINTS.perExplanation}`))
    .returning();

  if (!charged) {
    // 차감에 실패했으면 잡아 둔 자리를 반드시 돌려놓는다 — 그러지 않으면
    // 돈은 안 냈는데 열린 것으로 남아 다음 요청이 공짜로 통과한다.
    await db
      .delete(unlockedExplanations)
      .where(eq(unlockedExplanations.id, claim.id));
    return { ok: false, reason: "not-enough-points" };
  }

  await db.insert(pointLedger).values({
    memberId: member.id,
    kind: "spend",
    amount: POINTS.perExplanation,
    reason: `explanation:${questionId}`,
  });

  return { ok: true, explanation: question.explanation, pointsLeft: charged.points, alreadyOpen: false };
}
