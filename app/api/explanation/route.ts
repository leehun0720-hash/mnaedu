import { NextResponse } from "next/server";
import { unlockExplanation } from "@/lib/members";

export const dynamic = "force-dynamic";

/**
 * 해설 열람 — 정답·해설이 밖으로 나가는 유일한 경로.
 *
 * 공개 페이지 데이터에는 절대 실리지 않고(불변 원칙), 로그인한 회원이
 * 포인트를 낸 경우에만 이 라우트가 본문을 돌려준다 (보고서 4.3 · 8장).
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

  const result = await unlockExplanation(questionId);
  if (result.ok) {
    return NextResponse.json({
      explanation: result.explanation,
      pointsLeft: result.pointsLeft,
      alreadyOpen: result.alreadyOpen,
    });
  }

  const messages: Record<typeof result.reason, { message: string; status: number }> = {
    "no-db": { message: "아직 준비 중입니다.", status: 503 },
    "not-member": { message: "로그인 후 이용하실 수 있습니다.", status: 401 },
    "not-found": { message: "해설이 아직 등록되지 않았습니다.", status: 404 },
    "locked-level": { message: "유료회원에게 열리는 레벨입니다.", status: 403 },
    "free-tier": { message: "해설 열람은 유료회원에게 열립니다.", status: 403 },
    "not-answered": { message: "문제를 먼저 풀어 주십시오. 해설은 풀이의 보상입니다.", status: 409 },
    "not-enough-points": { message: "포인트가 부족합니다. 문제 풀이로 적립한 뒤 다시 열람해 주십시오.", status: 402 },
  };
  const { message, status } = messages[result.reason];
  return NextResponse.json({ error: message }, { status });
}
