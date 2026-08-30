import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { members, orders, type Order } from "@/db/schema";
import { extendUntil, findPlan, newOrderId } from "@/lib/billing";
import { getCurrentMember } from "@/lib/members";

/**
 * 유료 전환 주문 — 신청부터 구독 개시까지.
 *
 * PG를 붙이기 전에도 흐름이 끊기지 않도록 승인 주체를 갈아 끼울 수 있게
 * 짰다. 지금은 관리자가 승인하고(provider: manual), 토스페이먼츠를 붙이면
 * 결제 승인 응답이 같은 activateOrder()를 부른다 — 구독 연장과 이력은
 * 어느 쪽으로 들어와도 한 곳에서만 일어난다.
 */

export type CreateResult =
  | { ok: true; order: Order }
  | { ok: false; reason: "no-db" | "not-member" | "bad-plan" | "already-pending" };

export async function createOrder(planCode: string): Promise<CreateResult> {
  if (!isDbConfigured()) return { ok: false, reason: "no-db" };
  const member = await getCurrentMember();
  if (!member) return { ok: false, reason: "not-member" };

  const plan = findPlan(planCode);
  if (!plan) return { ok: false, reason: "bad-plan" };

  const db = getDb();
  // 승인을 기다리는 신청이 이미 있으면 새로 만들지 않는다 — 중복 입금과
  // 중복 승인을 부르는 가장 흔한 경로다.
  const [pending] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.memberId, member.id), eq(orders.status, "pending")))
    .limit(1);
  if (pending) return { ok: false, reason: "already-pending" };

  const [row] = await db
    .insert(orders)
    .values({
      orderId: newOrderId(),
      memberId: member.id,
      planCode: plan.code,
      planName: plan.name,
      amount: plan.amount,
      days: plan.days,
      status: "pending",
      provider: "manual",
    })
    .returning();

  return { ok: true, order: row };
}

/** 내 주문 내역 — 신청 화면에서 진행 상태를 보여 준다 */
export async function getMyOrders(memberId: number): Promise<Order[]> {
  if (!isDbConfigured()) return [];
  return getDb()
    .select()
    .from(orders)
    .where(eq(orders.memberId, memberId))
    .orderBy(desc(orders.createdAt))
    .limit(20);
}

/**
 * 주문을 결제 완료로 확정하고 구독을 연다.
 *
 * pending인 주문에만 적용되므로 두 번 불려도 기간이 두 배로 늘지 않는다 —
 * PG 승인과 관리자 승인이 겹치거나, 웹훅이 재전송되는 상황을 그대로 견딘다.
 */
export async function activateOrder(
  orderRowId: number,
  opts: { provider?: string; providerKey?: string; note?: string } = {}
): Promise<{ ok: boolean; reason?: string }> {
  if (!isDbConfigured()) return { ok: false, reason: "no-db" };
  const db = getDb();

  const [order] = await db
    .update(orders)
    .set({
      status: "paid",
      paidAt: new Date(),
      ...(opts.provider ? { provider: opts.provider } : {}),
      ...(opts.providerKey ? { providerKey: opts.providerKey } : {}),
      ...(opts.note ? { note: opts.note } : {}),
    })
    .where(and(eq(orders.id, orderRowId), eq(orders.status, "pending")))
    .returning();
  if (!order) return { ok: false, reason: "not-pending" };

  const [member] = await db.select().from(members).where(eq(members.id, order.memberId)).limit(1);
  if (!member) return { ok: false, reason: "no-member" };

  await db
    .update(members)
    .set({
      tier: "paid",
      paidUntil: extendUntil(member.paidUntil, order.days),
      updatedAt: new Date(),
    })
    .where(eq(members.id, order.memberId));

  return { ok: true };
}

export async function cancelOrder(orderRowId: number, note: string): Promise<{ ok: boolean }> {
  if (!isDbConfigured()) return { ok: false };
  const [row] = await getDb()
    .update(orders)
    .set({ status: "canceled", note })
    .where(and(eq(orders.id, orderRowId), eq(orders.status, "pending")))
    .returning();
  return { ok: Boolean(row) };
}

/** 관리자 결제 관리 목록 */
export async function listOrders(status: string, page: number, pageSize: number) {
  if (!isDbConfigured()) return { rows: [], total: 0, pendingCount: 0 };
  const db = getDb();
  const where =
    status === "all" ? undefined : eq(orders.status, status === "" ? "pending" : status);

  const [rows, [total], [pending]] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderId: orders.orderId,
        planName: orders.planName,
        amount: orders.amount,
        days: orders.days,
        status: orders.status,
        provider: orders.provider,
        note: orders.note,
        createdAt: orders.createdAt,
        paidAt: orders.paidAt,
        memberEmail: members.email,
        memberName: members.name,
      })
      .from(orders)
      .leftJoin(members, eq(orders.memberId, members.id))
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: sql<number>`count(*)` }).from(orders).where(where),
    db.select({ value: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "pending")),
  ]);

  return { rows, total: Number(total?.value ?? 0), pendingCount: Number(pending?.value ?? 0) };
}
