import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/billing.ts", import.meta.url).href;
const { isPaidNow, extendUntil, newOrderId, findPlan, PLANS } = await import(url);

const NOW = new Date("2026-08-30T00:00:00Z");

test("만료된 구독은 유료 자격을 잃는다", () => {
  assert.equal(isPaidNow("paid", new Date("2026-09-30T00:00:00Z"), NOW), true);
  assert.equal(isPaidNow("paid", new Date("2026-08-29T23:59:00Z"), NOW), false);
  // 만료일이 없으면 기한 없음 — 관리자가 직접 올린 계정
  assert.equal(isPaidNow("paid", null, NOW), true);
  // 무료회원은 만료일이 남아 있어도 유료가 아니다
  assert.equal(isPaidNow("free", new Date("2026-12-31T00:00:00Z"), NOW), false);
});

test("연장은 남은 기간을 잃지 않는다", () => {
  // 아직 20일 남았다면 그 끝에서 30일 더 — 미리 결제해도 손해가 없다
  const remaining = new Date("2026-09-19T00:00:00Z");
  assert.equal(
    extendUntil(remaining, 30, NOW).toISOString(),
    new Date("2026-10-19T00:00:00Z").toISOString()
  );
  // 이미 만료됐으면 지금부터 센다 (과거에 이어 붙이면 즉시 만료된다)
  assert.equal(
    extendUntil(new Date("2026-01-01T00:00:00Z"), 30, NOW).toISOString(),
    new Date("2026-09-29T00:00:00Z").toISOString()
  );
  assert.equal(
    extendUntil(null, 30, NOW).toISOString(),
    new Date("2026-09-29T00:00:00Z").toISOString()
  );
});

test("주문번호는 토스가 받는 형식이다", () => {
  const id = newOrderId();
  // 6~64자, 영숫자와 -_ 만 (토스페이먼츠 제약)
  assert.match(id, /^[A-Za-z0-9_-]{6,64}$/);
  assert.notEqual(newOrderId(), newOrderId());
});

test("요금제는 코드로 찾히고 기간이 양수다", () => {
  for (const p of PLANS) {
    assert.equal(findPlan(p.code)?.name, p.name);
    assert.ok(p.days > 0 && p.amount > 0);
  }
  assert.equal(findPlan("없는요금제"), undefined);
});
