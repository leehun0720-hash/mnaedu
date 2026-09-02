import { NextResponse } from "next/server";
import { revealAnswer } from "@/lib/members";

export const dynamic = "force-dynamic";

/**
 * 정답·해설 열람 — 이 둘이 서버 밖으로 나가는 유일한 경로.
 *
 * 문제 본문은 누구나 보지만 정답과 해설은 로그인한 회원에게만 나간다.
 * 공개 페이지 데이터에서는 원천 배제되므로, 여기가 막히면 정답은 새지
 * 않고 그저 열리지 않을 뿐이다.
 */
export async function POST(request: Request) {
  let questionId: number;
  try {
    const body = (await request.json()) as { questionId?: unknown };
    questionId = Number(body.questionId);
    if (!Number.isInteger(questionId) || questionId <= 0) throw new Error("bad id");
  } catch {
    return NextResponse.json({ error: "문제를 찾을 수 없습니다." }, { status: 400 });
  }

  const result = await revealAnswer(questionId);
  if (result.ok) {
    return NextResponse.json({ answer: result.answer, explanation: result.explanation });
  }

  const messages: Record<typeof result.reason, { message: string; status: number }> = {
    "no-db": { message: "아직 준비 중입니다.", status: 503 },
    "not-member": { message: "정답과 해설은 회원에게 공개됩니다.", status: 401 },
    "not-found": { message: "정답이 아직 등록되지 않았습니다.", status: 404 },
  };
  const { message, status } = messages[result.reason];
  return NextResponse.json(
    { error: message, needsMember: result.reason === "not-member" },
    { status }
  );
}
