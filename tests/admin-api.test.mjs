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

test("표나 열이 없을 때는 무엇을 하셔야 하는지 일러 준다", async () => {
  for (const err of [
    new Error('relation "questions" does not exist'),
    Object.assign(new Error("db error"), { message: "42P01" }),
    // 드라이버는 진짜 이유를 cause 안에 넣는다. 겉만 보면 놓친다.
    Object.assign(new Error("Failed query: select ..."), {
      cause: Object.assign(new Error('column "note" does not exist'), { code: "42703" }),
    }),
  ]) {
    const body = await storageFailure(err, "question insert").json();
    assert.match(body.error, /setup\.sql/);
  }
});

test("원인 사슬이 순환해도 멈춘다", async () => {
  // 시한 없는 재귀는 서버리스 함수를 통째로 넘어뜨린다
  const a = new Error("바깥");
  const inner = new Error("안쪽");
  Object.assign(a, { cause: inner });
  Object.assign(inner, { cause: a });
  const body = await storageFailure(a, "loop").json();
  assert.equal(typeof body.error, "string");
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

const { runQuery } = await import(url);

// 회장님 화면이 "서버가 응답하지 않습니다"에 갇혔다. 서버가 먼저 말해야
// 무엇이 막혔는지 알 수 있다 — 시한을 넘긴 것과 실패한 것을 갈라 말한다.

test("제때 끝난 조회는 값을 그대로 준다", async () => {
  const out = await runQuery(Promise.resolve([1, 2]), "회원 목록");
  assert.equal(out.ok, true);
  assert.deepEqual(out.value, [1, 2]);
});

test("시한을 넘기면 무엇이 얼마나 걸렸는지 말한다", async () => {
  const out = await runQuery(new Promise(() => {}), "회원 목록", 40);
  assert.equal(out.ok, false);
  assert.equal(out.response.status, 504);
  const body = await out.response.json();
  assert.match(body.error, /회원 목록/);
  assert.match(body.error, /초 안에 답하지 않았습니다/);
});

test("실패는 시한 초과와 다른 문장으로 돌아온다", async () => {
  const out = await runQuery(Promise.reject(new Error('column "note" does not exist')), "회원 목록");
  assert.equal(out.ok, false);
  assert.equal(out.response.status, 500);
  assert.match((await out.response.json()).error, /setup\.sql/);
});

test("시한을 넘긴 뒤에 실패해도 떠도는 거절을 남기지 않는다", async () => {
  const late = new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 60));
  const out = await runQuery(late, "회원 목록", 15);
  assert.equal(out.ok, false);
  await new Promise((r) => setTimeout(r, 140));
});
