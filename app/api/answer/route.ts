import { NextResponse } from "next/server";
import { submitAnswer } from "@/lib/answers";

export const dynamic = "force-dynamic";
// AI 채점(주관식)이 끼면 한 요청이 길어질 수 있다
export const maxDuration = 60;

/**
 * 답안 제출 — 풀이 → 채점 → 점수 → 포인트의 입구.
 *
 * 객관식은 이 응답 안에서 자동 채점까지 끝난다. 주관식은 AI 채점이
 * 설정돼 있으면 즉시, 아니면 회장 채점 대기(pending)로 남는다.
 */
export async function POST(request: Request) {
  let questionId: number;
  let body: string | undefined;
  let choiceIndex: number | undefined;
  try {
    const json = (await request.json()) as {
      questionId?: unknown;
      body?: unknown;
      choiceIndex?: unknown;
    };
    questionId = Number(json.questionId);
    if (!Number.isInteger(questionId) || questionId <= 0) throw new Error("bad id");
    body = typeof json.body === "string" ? json.body : undefined;
    choiceIndex = json.choiceIndex == null ? undefined : Number(json.choiceIndex);
  } catch {
    return NextResponse.json({ error: "요청을 이해할 수 없습니다." }, { status: 400 });
  }

  const result = await submitAnswer(questionId, { body, choiceIndex });
  if (result.ok) {
    return NextResponse.json({
      answer: result.answer,
      pointsAwarded: result.pointsAwarded,
      pointsLeft: result.pointsLeft,
      correctChoiceIndex: result.correctChoiceIndex,
    });
  }

  const messages: Record<typeof result.reason, { message: string; status: number }> = {
    "no-db": { message: "아직 준비 중입니다.", status: 503 },
    "not-member": { message: "로그인 후 풀이하실 수 있습니다.", status: 401 },
    "not-found": { message: "문제를 찾을 수 없습니다.", status: 404 },
    "locked-level": { message: "유료회원에게 열리는 레벨입니다.", status: 403 },
    "already-answered": { message: "이미 제출한 문제입니다. 한 문제는 한 번만 풀 수 있습니다.", status: 409 },
    "bad-answer": { message: "답안을 확인해 주십시오. 주관식은 30자 이상 서술해야 합니다.", status: 400 },
  };
  const { message, status } = messages[result.reason];
  return NextResponse.json({ error: message }, { status });
}
