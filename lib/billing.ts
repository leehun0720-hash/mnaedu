/**
 * 유료 요금제와 구독 판정 (기획 보고서 4.3 · 9장-8).
 *
 * 데이터베이스를 건드리지 않는 순수 규칙이라 서버·클라이언트·테스트 어디서든
 * 같은 판단을 쓴다. 주문 저장과 구독 연장은 lib/orders.ts가 맡는다.
 */

/**
 * 금액 공개 스위치.
 *
 * 보고서 9장-8은 회장 승인 전까지 요금을 싣지 않는다. 그때까지 신청 화면은
 * 금액 대신 "안내 후 확정"으로 두고, 승인이 떨어지면 이 값을 true로 바꾼다 —
 * 금액 자체는 아래 요금제에 이미 들어 있으므로 한 줄만 고치면 된다.
 */
export const SHOW_PRICE = false;

export type Plan = {
  code: string;
  name: string;
  /** 이 요금제가 열어 주는 기간(일) */
  days: number;
  /** 원 단위. 확정 전까지 화면에 나가지 않는다 (SHOW_PRICE) */
  amount: number;
  line: string;
};

/**
 * 요금제. 금액은 회장 승인 전의 안이며, 확정되면 이 표만 고친다.
 * 과거 주문에는 승인 시점 금액이 박혀 있으므로 값을 바꿔도 소급되지 않는다.
 */
export const PLANS: Plan[] = [
  {
    code: "monthly",
    name: "월 이용권",
    days: 30,
    amount: 99000,
    line: "L2~L5 전문가 퀴즈와 회장 해설이 30일간 열립니다.",
  },
  {
    code: "yearly",
    name: "연 이용권",
    days: 365,
    amount: 990000,
    line: "1년 과정을 끝까지 밟는 회원을 위한 이용권입니다.",
  },
];

export function findPlan(code: string): Plan | undefined {
  return PLANS.find((p) => p.code === code);
}

export function formatAmount(won: number): string {
  return `${won.toLocaleString("ko-KR")}원`;
}

/**
 * 지금 유료 자격이 있는가.
 *
 * 등급만 보면 만료된 구독도 계속 열린다. 만료일이 없으면(관리자가 직접 올린
 * 계정) 기한 없이 유효하고, 있으면 그 시각까지만 유효하다.
 */
export function isPaidNow(
  tier: string,
  paidUntil: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (tier !== "paid") return false;
  if (!paidUntil) return true;
  const until = paidUntil instanceof Date ? paidUntil : new Date(paidUntil);
  return Number.isFinite(until.getTime()) && until.getTime() > now.getTime();
}

/**
 * 구독을 연장한다. 아직 남은 기간이 있으면 그 끝에 이어 붙이고, 없거나
 * 만료됐으면 지금부터 센다 — 미리 결제한 회원이 기간을 잃지 않도록.
 */
export function extendUntil(
  current: Date | string | null | undefined,
  days: number,
  now: Date = new Date()
): Date {
  const base =
    current && new Date(current).getTime() > now.getTime() ? new Date(current) : new Date(now);
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * 가맹점 주문번호. 토스는 6~64자의 영숫자와 -_ 만 받는다. 시각을 앞에 두어
 * 정렬이 곧 시간순이 되게 하고, 뒤에 난수를 붙여 같은 밀리초 충돌을 막는다.
 */
export function newOrderId(random: () => number = Math.random): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, "0");
  return `FMA-${stamp}-${rand}`;
}
