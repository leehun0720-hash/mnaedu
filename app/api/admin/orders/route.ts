import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { activateOrder, cancelOrder, listOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/**
 * 결제 관리 — 유료 전환 신청을 확인하고 승인한다.
 *
 * PG를 붙이기 전에는 여기가 유일한 승인 경로다. 붙인 뒤에도 계좌이체 같은
 * 대체 수단을 위해 남는다.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? "pending";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const { rows, total, pendingCount } = await listOrders(status, page, PAGE_SIZE);
  return NextResponse.json({ orders: rows, total, pendingCount, page, pageSize: PAGE_SIZE });
}

/** 승인·취소 — {id, action: "approve" | "cancel", note?} */
export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let id: number;
  let action: string;
  let note: string;
  try {
    const body = (await request.json()) as { id?: unknown; action?: unknown; note?: unknown };
    id = Number(body.id);
    action = String(body.action ?? "");
    note = String(body.note ?? "").trim().slice(0, 200);
    if (!Number.isInteger(id) || id <= 0) throw new Error("bad id");
    if (action !== "approve" && action !== "cancel") throw new Error("bad action");
  } catch {
    return NextResponse.json({ error: "요청을 이해할 수 없습니다." }, { status: 400 });
  }

  if (action === "cancel") {
    const result = await cancelOrder(id, note || "관리자 취소");
    if (!result.ok) {
      return NextResponse.json({ error: "확인 중인 신청이 아닙니다." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  const result = await activateOrder(id, { provider: "manual", note: note || "관리자 승인" });
  if (!result.ok) {
    const message =
      result.reason === "not-pending"
        ? "이미 처리된 신청입니다."
        : "승인하지 못했습니다. 회원을 찾을 수 없습니다.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
