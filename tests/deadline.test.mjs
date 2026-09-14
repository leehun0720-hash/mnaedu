import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/deadline.ts", import.meta.url).href;
const { withDeadline } = await import(url);

// 데이터베이스가 죽지 않고 느려지기만 할 때가 가장 나쁘다. 로그인 한 번에
// 곁가지 조회가 서넛 이어지므로, 시한이 없으면 그 합만큼 화면이 멎는다.

test("제때 끝나면 그 값을 그대로 준다", async () => {
  assert.equal(await withDeadline(Promise.resolve(7), 1000, -1, "t"), 7);
});

test("시한을 넘기면 물러난다 — 기다리지 않는다", async () => {
  const never = new Promise(() => {});
  const t0 = Date.now();
  assert.equal(await withDeadline(never, 60, "물러남", "t"), "물러남");
  assert.ok(Date.now() - t0 < 1000, "시한 뒤에도 붙들려 있으면 안 된다");
});

test("실패해도 던지지 않고 물러난다", async () => {
  assert.equal(await withDeadline(Promise.reject(new Error("boom")), 1000, null, "t"), null);
});

test("시한을 넘긴 뒤에 실패해도 떠도는 거절을 남기지 않는다", async () => {
  // 잡히지 않은 거절은 서버리스 함수를 통째로 넘어뜨린다
  const late = new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 40));
  assert.equal(await withDeadline(late, 10, "물러남", "t"), "물러남");
  await new Promise((r) => setTimeout(r, 120));
});
