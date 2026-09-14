import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/admin-api.ts", import.meta.url).href;
const { storageFailure, readJsonBody } = await import(url);

// 회장님 화면이 "저장 중…"에 갇힌 적이 있다. 처리기가 그냥 던지면 Next.js가
// HTML 오류 쪽을 돌려주고, 화면은 그것을 JSON으로 읽다 말없이 멎기 때문이다.
// 그래서 어떤 실패든 JSON 한 줄로 나가야 한다 — 이 계약을 여기서 지킨다.

test("데이터베이스가 넘어져도 답은 JSON이다", async () => {
  const res = storageFailure(new Error("connection terminated unexpectedly"), "question insert");
  assert.equal(res.status, 500);
  assert.match(res.headers.get("content-type") ?? "", /application\/json/);
  const body = await res.json();
  assert.equal(typeof body.error, "string");
  assert.ok(body.error.length > 0);
});

test("표가 없을 때는 무엇을 하셔야 하는지 일러 준다", async () => {
  for (const err of [
    new Error('relation "questions" does not exist'),
    Object.assign(new Error("db error"), { message: "42P01" }),
  ]) {
    const body = await storageFailure(err, "question insert").json();
    assert.match(body.error, /setup\.sql/);
  }
});

test("본문이 JSON이 아니면 던지지 않고 null을 돌려준다", async () => {
  assert.equal(await readJsonBody(new Request("http://x/", { method: "POST", body: "{ not json" })), null);
  const ok = await readJsonBody(
    new Request("http://x/", { method: "POST", body: JSON.stringify({ id: 7 }) })
  );
  assert.deepEqual(ok, { id: 7 });
});

test("실패 문구에 데이터베이스 속사정을 싣지 않는다", async () => {
  // 접속 문자열이나 내부 표 이름이 화면으로 새어 나가면 안 된다
  const body = await storageFailure(
    new Error("postgres://admin:hunter2@db.internal:5432/mnaedu timed out"),
    "question insert"
  ).json();
  assert.doesNotMatch(body.error, /postgres:|hunter2|db\.internal/);
});
