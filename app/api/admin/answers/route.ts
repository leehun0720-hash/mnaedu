import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { count, desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { answers, members, questions } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { gradeByAdmin } from "@/lib/answers";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

const PAGE_SIZE = 20;

/**
 * 채점함 — 대기 중인 주관식 답안을 회장이 직접 채점한다.
 *
 * 회원이 늘면 답안은 문제보다 훨씬 빨리 쌓인다. 기본은 '채점 대기'만 보여
 * 주고(할 일 목록), 지난 채점은 따로 불러 본다. 대기 건수는 목록과 별도로
 * 세어 주므로 페이지를 넘겨도 남은 일이 몇 건인지 알 수 있다.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ answers: [], total: 0, pendingCount: 0, page: 1 });

  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? "pending"; // pending | graded | all
  const page = Math.max(1, Number(params.get("page")) || 1);
  const where =
    status === "pending"
      ? eq(answers.status, "pending")
      : status === "graded"
        ? eq(answers.status, "graded")
        : undefined;

  const db = getDb();
  const rowsPromise = db
    .select({
      id: answers.id,
      status: answers.status,
      score: answers.score,
      gradedBy: answers.gradedBy,
      feedback: answers.feedback,
      body: answers.body,
      createdAt: answers.createdAt,
      questionId: answers.questionId,
      prompt: questions.prompt,
      level: questions.level,
      track: questions.track,
      memberEmail: members.email,
      memberName: members.name,
    })
    .from(answers)
    .leftJoin(questions, eq(answers.questionId, questions.id))
    .leftJoin(members, eq(answers.memberId, members.id))
    .where(where)
    .orderBy(desc(answers.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [rows, [totals], [pending]] = await Promise.all([
    rowsPromise,
    db.select({ value: count() }).from(answers).where(where),
    db.select({ value: count() }).from(answers).where(eq(answers.status, "pending")),
  ]);

  return NextResponse.json({
    answers: rows,
    total: totals?.value ?? 0,
    pendingCount: pending?.value ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}

/** 채점 저장 — {id, score, feedback} */
export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });

  let id: number;
  let score: number;
  let feedback: string;
  try {
    const json = (await request.json()) as { id?: unknown; score?: unknown; feedback?: unknown };
    id = Number(json.id);
    score = Math.round(Number(json.score));
    feedback = String(json.feedback ?? "").trim();
    if (!Number.isInteger(id) || id <= 0) throw new Error("bad id");
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error("bad score");
  } catch {
    return NextResponse.json({ error: "점수는 0~100 사이여야 합니다." }, { status: 400 });
  }

  const result = await gradeByAdmin(id, score, feedback || null);
  if (!result.ok) return NextResponse.json({ error: "답안을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
