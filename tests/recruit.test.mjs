import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/recruit.ts", import.meta.url).href;
const {
  APPLY_KINDS,
  APPLY_STATUSES,
  PASS_SCORE,
  RECRUIT_TRACK,
  isRecruitTrack,
  normalizeKind,
  normalizeStatus,
  validateApply,
} = await import(url);

/** 통과하는 지원서 한 벌 — 여기서 한 칸씩 흠집을 내며 시험한다 */
function ok(over = {}) {
  return {
    name: "홍길동",
    email: "hong@example.com",
    phone: "010-0000-0000",
    kind: "직원채용",
    note: "지원 동기입니다.",
    agree: true,
    answers: [{ questionId: 1, prompt: "문제 본문", answer: "답안입니다." }],
    ...over,
  };
}

test("채용 문제는 업무 분야가 아니다", () => {
  assert.equal(RECRUIT_TRACK, "recruit");
  assert.equal(isRecruitTrack("recruit"), true);
  assert.equal(isRecruitTrack(" recruit "), true);
  // 다섯 업무 분야 어디에도 해당하지 않아야 업무 화면에 섞이지 않는다
  for (const slug of ["brokerage", "dispute", "financing", "family-office", "investor-club"]) {
    assert.equal(isRecruitTrack(slug), false, `${slug}가 채용으로 읽힌다`);
  }
  assert.equal(isRecruitTrack(null), false);
  assert.equal(isRecruitTrack(undefined), false);
});

test("지원 구분과 전형 상태는 정해진 것만 받는다", () => {
  assert.equal(normalizeKind("인턴십"), "인턴십");
  // 모르는 값이 와도 화면이 비지 않는다 — 첫 값으로 물러난다
  assert.equal(normalizeKind("아무거나"), APPLY_KINDS[0]);
  assert.equal(normalizeKind(null), APPLY_KINDS[0]);
  assert.equal(normalizeStatus("합격"), "합격");
  assert.equal(normalizeStatus(""), APPLY_STATUSES[0]);
  assert.equal(APPLY_STATUSES[0], "접수");
});

test("합격선은 홈페이지에 적어 둔 기준과 같다", () => {
  assert.equal(PASS_SCORE, 80);
});

test("제대로 적은 지원서는 그대로 통과한다", () => {
  const r = validateApply(ok());
  assert.ok("value" in r, r.error);
  assert.equal(r.value.name, "홍길동");
  assert.equal(r.value.kind, "직원채용");
  assert.equal(r.value.answers.length, 1);
});

test("성함·이메일이 없으면 받지 않는다", () => {
  assert.match(validateApply(ok({ name: "" })).error, /성함/);
  assert.match(validateApply(ok({ name: "김" })).error, /성함/);
  assert.match(validateApply(ok({ email: "없음" })).error, /이메일/);
  assert.match(validateApply(ok({ email: "a@b" })).error, /이메일/);
});

test("개인정보 동의 없이는 접수되지 않는다", () => {
  // 동의 칸은 형식이 아니다 — 여기가 뚫리면 수집 근거가 없어진다
  assert.match(validateApply(ok({ agree: false })).error, /동의/);
  assert.match(validateApply(ok({ agree: undefined })).error, /동의/);
});

test("답안이 한 칸도 없으면 접수되지 않는다", () => {
  assert.match(validateApply(ok({ answers: [] })).error, /답안/);
  // 공백만 적은 답은 적지 않은 것과 같다
  assert.match(
    validateApply(ok({ answers: [{ questionId: 1, prompt: "p", answer: "   " }] })).error,
    /답안/
  );
});

test("망가진 답안 칸은 조용히 버리고 성한 것만 남긴다", () => {
  const r = validateApply(
    ok({
      answers: [
        { questionId: 0, prompt: "p", answer: "번호가 없다" },
        { questionId: "글자", prompt: "p", answer: "번호가 숫자가 아니다" },
        { questionId: 7, prompt: "제대로 된 문제", answer: "제대로 된 답" },
      ],
    })
  );
  assert.ok("value" in r, r.error);
  assert.equal(r.value.answers.length, 1);
  assert.equal(r.value.answers[0].questionId, 7);
});

test("지나치게 긴 값은 조용히 자르지 않고 돌려보낸다", () => {
  // 이름이 소리 없이 잘린 지원서보다 다시 적어 달라는 쪽이 낫다
  assert.match(validateApply(ok({ name: "가".repeat(60) })).error, /성함/);
  assert.match(validateApply(ok({ note: "가".repeat(3000) })).error, /지원 동기/);
  assert.match(
    validateApply(ok({ answers: [{ questionId: 1, prompt: "p", answer: "가".repeat(5000) }] })).error,
    /답안/
  );
});

test("빈 연락처와 빈 지원 동기는 없는 것으로 담는다", () => {
  const r = validateApply(ok({ phone: "  ", note: "" }));
  assert.ok("value" in r, r.error);
  assert.equal(r.value.phone, null);
  assert.equal(r.value.note, null);
});

test("답안에 실린 문제 본문은 낸 순간 그대로 남는다", () => {
  // 회장이 나중에 문제를 고치거나 지워도 지원서가 읽혀야 한다
  const r = validateApply(
    ok({ answers: [{ questionId: 3, prompt: "그때 보였던 문제", answer: "답" }] })
  );
  assert.ok("value" in r, r.error);
  assert.equal(r.value.answers[0].prompt, "그때 보였던 문제");
});
