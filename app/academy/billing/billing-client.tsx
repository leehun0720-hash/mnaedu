"use client";

import { useState } from "react";
import Link from "next/link";

type PlanView = { code: string; name: string; days: number; line: string; amount: number | null };
type OrderView = {
  orderId: string;
  planName: string;
  status: string;
  createdAt: string;
  amount: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "확인 중",
  paid: "결제 완료",
  canceled: "취소됨",
  failed: "실패",
};

export default function BillingClient({
  plans,
  tier,
  paidUntil,
  orders: initialOrders,
}: {
  plans: PlanView[];
  tier: "free" | "paid";
  paidUntil: string | null;
  orders: OrderView[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const hasPending = orders.some((o) => o.status === "pending");

  async function apply(code: string) {
    setBusy(code);
    setError("");
    setDone("");
    try {
      const res = await fetch("/api/billing/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: code }),
      });
      const data = (await res.json()) as {
        error?: string;
        orderId?: string;
        planName?: string;
        amount?: number;
        status?: string;
      };
      if (!res.ok || !data.orderId) {
        setError(data.error ?? "신청하지 못했습니다. 잠시 후 다시 시도해 주십시오.");
        return;
      }
      setOrders([
        {
          orderId: data.orderId,
          planName: data.planName ?? "",
          status: data.status ?? "pending",
          createdAt: new Date().toISOString(),
          amount: null,
        },
        ...orders,
      ]);
      setDone(`신청이 접수되었습니다. 접수번호 ${data.orderId}`);
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도해 주십시오.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="me-card">
      <p className="me-eyebrow">유료회원 전환</p>
      <h1>{tier === "paid" ? "이용 중입니다" : "전문가 과정을 여십시오"}</h1>

      {tier === "paid" ? (
        <div className="bill-active">
          <p>
            L2~L5 전문가 퀴즈와 회장 해설이 열려 있습니다.
            {paidUntil && (
              <>
                {" "}
                이용 기간은 <strong>{new Date(paidUntil).toLocaleDateString("ko-KR")}</strong>
                까지입니다.
              </>
            )}
            {!paidUntil && " 기간 제한 없이 이용하실 수 있습니다."}
          </p>
        </div>
      ) : (
        <p className="bill-intro">
          무료회원은 L1 입문 퀴즈까지 풀 수 있습니다. 유료로 전환하시면 L2~L5 전문가 퀴즈가
          열리고, 실전에서 논리가 무너지는 조건까지 짚는 성보경 회장 해설을 포인트로 여실 수
          있습니다.
        </p>
      )}

      <div className="bill-plans">
        {plans.map((p) => (
          <div key={p.code} className="bill-plan">
            <h2>{p.name}</h2>
            <p className="bill-plan-price">
              {p.amount === null ? (
                <em>금액은 상담 후 안내드립니다</em>
              ) : (
                <>
                  {p.amount.toLocaleString("ko-KR")}
                  <small>원</small>
                </>
              )}
            </p>
            <p className="bill-plan-line">{p.line}</p>
            <button
              className="button button-red"
              disabled={Boolean(busy) || hasPending}
              onClick={() => apply(p.code)}
            >
              {busy === p.code ? "접수 중…" : hasPending ? "확인 중인 신청이 있습니다" : "신청하기"}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="quiz-error">{error}</p>}
      {done && <p className="bill-done">{done}</p>}

      <p className="bill-notice">
        결제 연결 준비 중입니다. 지금 신청하시면 접수 후 담당자가 결제 방법을 개별
        안내드리고, 확인되는 대로 이용 기간이 열립니다.
      </p>

      {orders.length > 0 && (
        <div className="bill-orders">
          <h2>신청 내역</h2>
          <ul>
            {orders.map((o) => (
              <li key={o.orderId}>
                <span>{o.planName}</span>
                <code>{o.orderId}</code>
                <span data-status={o.status}>{STATUS_LABEL[o.status] ?? o.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="quiz-back">
        <Link href="/academy/me">← 내 학습 현황</Link>
        <Link href="/academy#exam">문제 풀러 가기 →</Link>
      </p>
    </div>
  );
}
