import assert from "node:assert/strict";
import test from "node:test";

// Credentials for the tests only; the real ones live in the Vercel project.
process.env.ADMIN_PASSWORD = "correct-horse";
process.env.ADMIN_SESSION_SECRET = "test-secret-" + "x".repeat(32);

const authUrl = new URL("../lib/auth.ts", import.meta.url).href;
const parseUrl = new URL("../lib/parse-question.ts", import.meta.url).href;

const { createSession, verifySession, verifyPassword } = await import(authUrl);
const { parseQuestion } = await import(parseUrl);

test("password check accepts only the configured value", () => {
  assert.equal(verifyPassword("correct-horse"), true);
  assert.equal(verifyPassword("correct-horsf"), false);
  assert.equal(verifyPassword(""), false);
  assert.equal(verifyPassword("correct-horse "), false);
});

test("a freshly issued session verifies", async () => {
  assert.equal(await verifySession(await createSession()), true);
});

test("tampered and forged sessions are rejected", async () => {
  const token = await createSession();
  const [expiry, signature] = token.split(".");

  // Swapped signature
  assert.equal(await verifySession(`${expiry}.AAAA`), false);
  // Extending the deadline must fail: the expiry is inside the signed payload,
  // not merely carried next to it
  assert.equal(await verifySession(`9999999999999.${signature}`), false);
  // Already past
  assert.equal(await verifySession(`1000000000000.${signature}`), false);
  // Malformed and absent
  assert.equal(await verifySession("nonsense"), false);
  assert.equal(await verifySession(undefined), false);
});

test("pasted question is split into fields", () => {
  const parsed = parseQuestion(
    [
      "적대적 M&A",
      "대상회사가 방어수단을 발동했을 때 이를 다툴 논거를 서술하시오.",
      "① 신주발행 무효의 소",
      "② 주주총회 결의 취소",
      "정답: ①",
      "해설: 방어수단의 법적 한계를 아는지",
    ].join("\n")
  );

  assert.equal(parsed.track, "hostile");
  assert.equal(parsed.format, "객관식");
  assert.deepEqual(parsed.choices, ["신주발행 무효의 소", "주주총회 결의 취소"]);
  assert.equal(parsed.answer, "①");
  assert.match(parsed.explanation, /법적 한계/);
  // The level system is gone; the parser must not resurrect it
  assert.equal(parsed.level, undefined);

  // Labelled fields must not leak back into the visible prompt
  assert.ok(parsed.prompt.includes("방어수단"));
  assert.ok(!parsed.prompt.includes("정답"));
  assert.ok(!parsed.prompt.includes("해설"));
});

test("plain prose stays a written question", () => {
  const parsed = parseQuestion(
    "SPA 가격조정 방식인 Locked-Box와 Closing Accounts의 차이를 설명하시오."
  );
  assert.equal(parsed.format, "주관식");
  assert.deepEqual(parsed.choices, []);
});


// ── 회원 인증 ─────────────────────────────────────────────────────────────
process.env.MEMBER_SESSION_SECRET = "member-test-secret-" + "y".repeat(32);
const memberUrl = new URL("../lib/member-auth.ts", import.meta.url).href;
const {
  hashPassword,
  verifyPassword: verifyMemberPassword,
  createMemberSession,
  readMemberSession,
} = await import(memberUrl);

test("member password is stored as a salted derivation, never in the clear", async () => {
  const stored = await hashPassword("m4-pass-phrase");
  assert.ok(!stored.includes("m4-pass-phrase"));
  assert.match(stored, /^pbkdf2[$]\d+[$]/);

  // Same password, different salt -> different stored value
  const again = await hashPassword("m4-pass-phrase");
  assert.notEqual(stored, again);

  assert.equal(await verifyMemberPassword("m4-pass-phrase", stored), true);
  assert.equal(await verifyMemberPassword("m4-pass-phras", stored), false);
  assert.equal(await verifyMemberPassword("", stored), false);
  assert.equal(await verifyMemberPassword("m4-pass-phrase", "garbage"), false);
});

test("member session cannot be forged or extended in the browser", async () => {
  const token = await createMemberSession(42);
  assert.equal(await readMemberSession(token), 42);

  const [id, expiry, signature] = token.split(".");

  // Claiming to be someone else keeps the old signature - must fail
  assert.equal(await readMemberSession(`99.${expiry}.${signature}`), null);
  // Pushing the expiry out fails too, because it is inside the signed payload
  assert.equal(await readMemberSession(`${id}.${Number(expiry) + 8.64e7}.${signature}`), null);
  // Already expired
  const stale = await createMemberSession(7);
  const [sid, , ssig] = stale.split(".");
  assert.equal(await readMemberSession(`${sid}.${Date.now() - 1000}.${ssig}`), null);
  // Malformed and absent
  assert.equal(await readMemberSession("nonsense"), null);
  assert.equal(await readMemberSession(undefined), null);
});

test("an admin session is not accepted as a member session", async () => {
  const adminToken = await createSession();
  assert.equal(await readMemberSession(adminToken), null);
});

// ── 공개 payload 에 정답이 실리지 않는다 ─────────────────────────────────
const questionsUrl = new URL("../lib/questions.ts", import.meta.url).href;
const { getPublicQuestions } = await import(questionsUrl);

test("public questions carry no answer and no explanation", async () => {
  const rows = await getPublicQuestions();
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal("answer" in row, false);
    assert.equal("explanation" in row, false);
    assert.equal("level" in row, false);
    assert.ok(row.prompt.length > 0);
  }
});
