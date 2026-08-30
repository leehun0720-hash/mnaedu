import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/members";
import { getMyOrders } from "@/lib/orders";
import { PLANS, SHOW_PRICE } from "@/lib/billing";
import { isAuthConfigured } from "@/lib/supabase/config";
import AuthShell from "../auth-shell";
import BillingClient from "./billing-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "유료회원 전환 | M&A 아카데미",
  robots: { index: false, follow: false },
};

export default async function BillingPage() {
  if (!isAuthConfigured()) redirect("/academy/login");
  const member = await getCurrentMember();
  if (!member) redirect("/academy/login");

  const orders = await getMyOrders(member.id);

  return (
    <AuthShell>
      <BillingClient
        plans={PLANS.map((p) => ({
          code: p.code,
          name: p.name,
          days: p.days,
          line: p.line,
          // 금액은 승인 전까지 화면에 내보내지 않는다 (보고서 9장-8)
          amount: SHOW_PRICE ? p.amount : null,
        }))}
        tier={member.tier}
        paidUntil={member.paidUntil ? member.paidUntil.toISOString() : null}
        orders={orders.map((o) => ({
          orderId: o.orderId,
          planName: o.planName,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
          amount: SHOW_PRICE ? o.amount : null,
        }))}
      />
    </AuthShell>
  );
}
