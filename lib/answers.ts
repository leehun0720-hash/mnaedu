import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { answers, members, pointLedger, questions, type Answer, type Question } from "@/db/schema";
import { PASS_SCORE, POINTS, canAccessLevel } from "@/lib/membership";
import { getCurrentMember, toProfile, type MemberProfile } from "@/lib/members";
import { levelCode } from "@/lib/questions";
import { gradeEssayWithAi, isAiGradingConfigured } from "@/lib/grading";

/**
 * 답안 제출과 채점 (풀이 → 채점 → 점수 → 포인트).
 *
 * - 한 문제 한 번: 선발 테스트 성격이라 재제출을 받지 않는다.
 * - 객관식: 저장된 정답과 대조해 즉시 자동 채점(100/0).
 * - 주관식: ANTHROPIC_API_KEY가 있으면 AI 채점, 없으면 회장 채점 대기.
 * - 통과(PASS_SCORE 이상)하면 퀴즈 포인트가 적립되고 통과 레벨이 오른다.
 */

export type AnswerView = {
  id: number;
  status: "pending" | "graded";
  score: number | null;
  gradedBy: string | null;
  feedback: string | null;
  body: string;
  choiceIndex: number | null;
  pass: boolean;
};

export function toAnswerView(row: Answer): AnswerView {
  return {
    id: row.id,
    status: row.status === "graded" ? "graded" : "pending",
    score: row.score,
    gradedBy: row.gradedBy,
    feedback: row.feedback,
    body: row.body,
    choiceIndex: row.choiceIndex,
    pass: row.status === "graded" && (row.score ?? 0) >= PASS_SCORE,
  };
}

export async function getMyAnswer(memberId: number, questionId: number): Promise<AnswerView | null> {
  if (!isDbConfigured()) return null;
  const [row] = await getDb()
    .select()
    .from(answers)
    .where(and(eq(answers.memberId, memberId), eq(answers.questionId, questionId)))
    .limit(1);
  return row ? toAnswerView(row) : null;
}

/** 내 학습 현황 화면용 — 최근 풀이와 집계 */
export async function getMyAnswerSummary(memberId: number) {
  if (!isDbConfigured()) return { total: 0, pending: 0, passed: 0, avgScore: null as number | null, recent: [] as { questionId: number; prompt: string; status: string; score: number | null; pass: boolean }[] };
  const db = getDb();
  const rows = await db
    .select({
      questionId: answers.questionId,
      status: answers.status,
      score: answers.score,
      prompt: questions.prompt,
    })
    .from(answers)
    .leftJoin(questions, eq(answers.questionId, questions.id))
    .where(eq(answers.memberId, memberId))
    .orderBy(desc(answers.createdAt))
    .limit(50);

  const graded = rows.filter((r) => r.status === "graded" && r.score != null);
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status !== "graded").length,
    passed: graded.filter((r) => (r.score ?? 0) >= PASS_SCORE).length,
    avgScore: graded.length
      ? Math.round(graded.reduce((a, r) => a + (r.score ?? 0), 0) / graded.length)
      : null,
    recent: rows.slice(0, 5).map((r) => ({
      questionId: r.questionId,
      prompt: (r.prompt ?? "").slice(0, 80),
      status: r.status,
      score: r.score,
      pass: r.status === "graded" && (r.score ?? 0) >= PASS_SCORE,
    })),
  };
}

/**
 * 객관식 정답 대조. 관리자 화면의 정답 칸은 자유 입력이라 "②", "2",
 * 보기 원문 어느 쪽이든 올 수 있다 — 해석이 안 되면 자동 채점을 포기하고
 * 회장 채점으로 넘긴다 (오채점보다 안전하다).
 */
const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";

export function resolveCorrectIndex(question: Pick<Question, "choices" | "answer">): number | null {
  const choices = question.choices ?? [];
  const raw = (question.answer ?? "").trim();
  if (!raw || choices.length === 0) return null;

  const circled = CIRCLED.indexOf(raw[0]);
  if (circled >= 0 && circled < choices.length) return circled;

  const num = Number(raw.replace(/[^0-9]/g, ""));
  if (raw.replace(/[^0-9]/g, "") && Number.isInteger(num) && num >= 1 && num <= choices.length) {
    return num - 1;
  }

  const textIdx = choices.findIndex((c) => c.trim() === raw);
  return textIdx >= 0 ? textIdx : null;
}

export type SubmitResult =
  | {
      ok: true;
      answer: AnswerView;
      pointsAwarded: number;
      pointsLeft: number;
      /** 객관식 채점 후에만 — 본인이 제출을 마친 뒤라 공개해도 된다 */
      correctChoiceIndex?: number;
    }
  | {
      ok: false;
      reason: "no-db" | "not-member" | "not-found" | "locked-level" | "already-answered" | "bad-answer";
    };

export async function submitAnswer(
  questionId: number,
  input: { body?: string; choiceIndex?: number }
): Promise<SubmitResult> {
  if (!isDbConfigured()) return { ok: false, reason: "no-db" };
  const member = await getCurrentMember();
  if (!member) return { ok: false, reason: "not-member" };

  const db = getDb();
  const [question] = await db
    .select()
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.published, true)))
    .limit(1);
  if (!question) return { ok: false, reason: "not-found" };
  if (!canAccessLevel(member.tier, question.level)) return { ok: false, reason: "locked-level" };

  const existing = await getMyAnswer(member.id, questionId);
  if (existing) return { ok: false, reason: "already-answered" };

  let body: string;
  let choiceIndex: number | null = null;
  if (question.format === "객관식") {
    const idx = Number(input.choiceIndex);
    const choices = question.choices ?? [];
    if (!Number.isInteger(idx) || idx < 0 || idx >= choices.length) {
      return { ok: false, reason: "bad-answer" };
    }
    choiceIndex = idx;
    body = choices[idx];
  } else {
    body = (input.body ?? "").trim();
    // 한 줄짜리 답으로는 실전 판단을 평가할 수 없다
    if (body.length < 30) return { ok: false, reason: "bad-answer" };
    if (body.length > 8000) body = body.slice(0, 8000);
  }

  const [inserted] = await db
    .insert(answers)
    .values({ memberId: member.id, questionId, body, choiceIndex })
    .onConflictDoNothing({ target: [answers.memberId, answers.questionId] })
    .returning();
  if (!inserted) return { ok: false, reason: "already-answered" };

  // ── 채점 ──────────────────────────────────────────────────────────────
  if (question.format === "객관식") {
    const correct = resolveCorrectIndex(question);
    if (correct != null) {
      const score = choiceIndex === correct ? 100 : 0;
      const graded = await applyGrade(inserted.id, member, question, score, null, "auto");
      return {
        ok: true,
        answer: graded.answer,
        pointsAwarded: graded.pointsAwarded,
        pointsLeft: graded.pointsLeft,
        correctChoiceIndex: correct,
      };
    }
    // 정답 해석 불가 → 회장 채점 대기
    return { ok: true, answer: toAnswerView(inserted), pointsAwarded: 0, pointsLeft: member.points };
  }

  // 주관식 — AI 채점(설정 시). 실패하면 채점 대기로 남겨 회장이 본다.
  if (isAiGradingConfigured()) {
    try {
      const result = await gradeEssayWithAi(question, body);
      if (result) {
        const graded = await applyGrade(inserted.id, member, question, result.score, result.feedback, "ai");
        return { ok: true, answer: graded.answer, pointsAwarded: graded.pointsAwarded, pointsLeft: graded.pointsLeft };
      }
    } catch (err) {
      console.error("[grading] AI grading failed; leaving pending:", err);
    }
  }
  return { ok: true, answer: toAnswerView(inserted), pointsAwarded: 0, pointsLeft: member.points };
}

/**
 * 채점 확정 — 점수를 기록하고, 통과면 포인트 적립·승급까지 한 번에.
 * pending 상태의 답안에만 적용되므로 포인트가 두 번 붙지 않는다.
 */
async function applyGrade(
  answerId: number,
  member: MemberProfile,
  question: Question,
  score: number,
  feedback: string | null,
  gradedBy: "auto" | "ai" | "admin"
): Promise<{ answer: AnswerView; pointsAwarded: number; pointsLeft: number }> {
  const db = getDb();
  const [row] = await db
    .update(answers)
    .set({ status: "graded", score, feedback, gradedBy, gradedAt: new Date() })
    .where(and(eq(answers.id, answerId), eq(answers.status, "pending")))
    .returning();

  if (!row) {
    // 이미 다른 경로로 채점됨 — 지금 상태를 그대로 돌려준다
    const [current] = await db.select().from(answers).where(eq(answers.id, answerId)).limit(1);
    return { answer: toAnswerView(current), pointsAwarded: 0, pointsLeft: member.points };
  }

  let pointsAwarded = 0;
  let pointsLeft = member.points;
  if (score >= PASS_SCORE) {
    pointsAwarded = POINTS.perQuiz;
    const levelNum = Number((levelCode(question.level) ?? "L0").slice(1));
    const [updated] = await db
      .update(members)
      .set({
        points: sql`${members.points} + ${POINTS.perQuiz}`,
        clearedLevel: sql`GREATEST(${members.clearedLevel}, ${levelNum})`,
        updatedAt: new Date(),
      })
      .where(eq(members.id, member.id))
      .returning();
    pointsLeft = updated?.points ?? member.points + POINTS.perQuiz;
    await db.insert(pointLedger).values({
      memberId: member.id,
      kind: "earn",
      amount: POINTS.perQuiz,
      reason: `quiz:${question.id}`,
    });
  }

  return { answer: toAnswerView(row), pointsAwarded, pointsLeft };
}

/** 관리자(회장) 채점 — /api/admin/answers에서 쓴다 */
export async function gradeByAdmin(
  answerId: number,
  score: number,
  feedback: string | null
): Promise<{ ok: boolean }> {
  if (!isDbConfigured()) return { ok: false };
  const db = getDb();
  const [row] = await db.select().from(answers).where(eq(answers.id, answerId)).limit(1);
  if (!row) return { ok: false };
  const [question] = await db.select().from(questions).where(eq(questions.id, row.questionId)).limit(1);
  const [memberRow] = await db.select().from(members).where(eq(members.id, row.memberId)).limit(1);
  if (!question || !memberRow) return { ok: false };

  // 만료 판정까지 한곳에서 하도록 같은 변환기를 쓴다
  await applyGrade(answerId, toProfile(memberRow), question, score, feedback, "admin");
  return { ok: true };
}
