import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/qna.ts", import.meta.url).href;
const { QNA_LIMITS, answerState, validateAnswer, validateQuestion } = await import(url);

/** 통과하는 질문 한 벌 — 여기서 한 칸씩 흠집을 내며 시험한다 */
function ok(over = {}) {
  return {
    name: "홍길동",
    email: "hong@example.com",
    title: "자문 수수료는 어떻게 산정됩니까?",
    body: "착수금과 성공보수의 비중이 거래 규모에 따라 달라지는지 궁금합니다.",
    agree: true,
    ...over,
  };
}

test("제대로 적은 질문은 그대로 통과한다", () => {
  const r = validateQuestion(ok());
  assert.ok("value" in r, r.error);
  assert.equal(r.value.name, "홍길동");
  assert.equal(r.value.secret, false);
});

test("이름·제목·내용이 모자라면 받지 않는다", () => {
  assert.match(validateQuestion(ok({ name: "" })).error, /이름/);
  assert.match(validateQuestion(ok({ title: "짧다" })).error, /제목/);
  assert.match(validateQuestion(ok({ body: "짧습니다" })).error, /내용/);
});

test("개인정보 동의 없이는 접수되지 않는다", () => {
  // 동의 칸은 형식이 아니다 — 여기가 뚫리면 수집 근거가 없어진다
  assert.match(validateQuestion(ok({ agree: false })).error, /동의/);
  assert.match(validateQuestion(ok({ agree: undefined })).error, /동의/);
});

test("이메일은 선택이지만, 적으셨다면 형식을 본다", () => {
  const blank = validateQuestion(ok({ email: "" }));
  assert.ok("value" in blank, blank.error);
  assert.equal(blank.value.email, null, "빈 이메일은 없는 것으로 담는다");
  assert.match(validateQuestion(ok({ email: "주소아님" })).error, /이메일/);
});

test("비밀글 표시가 그대로 실려 간다", () => {
  const r = validateQuestion(ok({ secret: true }));
  assert.ok("value" in r, r.error);
  assert.equal(r.value.secret, true);
});

test("지나치게 긴 값은 조용히 자르지 않고 돌려보낸다", () => {
  assert.match(validateQuestion(ok({ name: "가".repeat(60) })).error, /이름/);
  assert.match(validateQuestion(ok({ title: "가".repeat(200) })).error, /제목/);
  assert.match(validateQuestion(ok({ body: "가".repeat(5000) })).error, /질문/);
});

test("답변은 비울 수 있고, 비우면 없는 것으로 담는다", () => {
  // 답을 지우면 '답변완료'가 아니어야 한다 — 답 없는 완료는 거짓말이다
  assert.deepEqual(validateAnswer(""), { value: null });
  assert.deepEqual(validateAnswer("   "), { value: null });
  assert.deepEqual(validateAnswer(null), { value: null });
  const r = validateAnswer("답변입니다.");
  assert.equal(r.value, "답변입니다.");
  assert.match(validateAnswer("가".repeat(QNA_LIMITS.answer + 1)).error, /답변/);
});

test("배지 문구는 답이 실제로 있는지만 본다", () => {
  assert.equal(answerState("답이 있다"), "답변완료");
  assert.equal(answerState(""), "답변대기");
  assert.equal(answerState("   "), "답변대기");
  assert.equal(answerState(null), "답변대기");
  assert.equal(answerState(undefined), "답변대기");
});
