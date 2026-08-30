import { NextResponse } from "next/server";
import { createOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * 유료 전환 신청 — 주문을 만든다.
 *
 * 결제 승인은 아직 이 경로에 없다. PG를 붙이기 전이므로 주문은 pending으로
 * 남고 관리자가 승인한다. 토스페이먼츠를 붙이면 이 응답의 주문번호·금액을
 * 결제창에 넘기고, 승인 결과를 /api/billing/confirm이 받는다.
 */
export async function POST(request: Request) {
  let planCode: string;
  try {
    const body = (await request.json()) as { planCode?: unknown };
    planCode = String(body.planCode ?? "");
    if (!planCode) throw new Error("no plan");
  } catch {
    return NextResponse.json({ error: "요금제를 선택해 주십시오." }, { status: 400 });
  }

  const result = await createOrder(planCode);
  if (result.ok) {
    return NextResponse.json({
      orderId: result.order.orderId,
      planName: result.order.planName,
      amount: result.order.amount,
      status: result.order.status,
    });
  }

  const messages: Record<typeof result.reason, { message: string; status: number }> = {
    "no-db": { message: "아직 준비 중입니다.", status: 503 },
    "not-member": { message: "로그인 후 신청하실 수 있습니다.", status: 401 },
    "bad-plan": { message: "요금제를 찾을 수 없습니다.", status: 400 },
    "already-pending": {
      message: "이미 접수된 신청이 있습니다. 확인 후 안내드리겠습니다.",
      status: 409,
    },
  };
  const { message, status } = messages[result.reason];
  return NextResponse.json({ error: message }, { status });
}
