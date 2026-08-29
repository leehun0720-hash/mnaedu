import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { answers, members, questions } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { gradeByAdmin } from "@/lib/answers";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** 채점함 — 대기 중인 주관식 답안을 회장이 직접 채점한다 */
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ answers: [] });

  const rows = await getDb()
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
    .orderBy(desc(answers.createdAt))
    .limit(100);

  // 대기 건이 먼저 보이도록 정렬한다
  rows.sort((a, b) => (a.status === b.status ? 0 : a.status === "pending" ? -1 : 1));
  return NextResponse.json({ answers: rows });
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
