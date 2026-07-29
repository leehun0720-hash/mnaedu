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
      "난이도: 상급",
      "적대적 M&A",
      "대상회사가 포이즌필을 발동했을 때 이를 무력화할 논거를 서술하시오.",
      "① 신주발행 무효의 소",
      "② 주주총회 결의 취소",
      "정답: ①",
      "출제 의도: 방어수단의 법적 한계를 아는지",
    ].join("\n")
  );

  assert.equal(parsed.level, "상급");
  assert.equal(parsed.track, "hostile");
  assert.equal(parsed.format, "객관식");
  assert.deepEqual(parsed.choices, ["신주발행 무효의 소", "주주총회 결의 취소"]);
  assert.equal(parsed.answer, "①");
  assert.match(parsed.intent, /법적 한계/);

  // Metadata and the withheld fields must not leak into the visible prompt
  assert.ok(parsed.prompt.includes("포이즌필"));
  assert.ok(!parsed.prompt.includes("난이도"));
  assert.ok(!parsed.prompt.includes("정답"));
  assert.ok(!parsed.prompt.includes("출제 의도"));
});

test("plain prose stays a written question", () => {
  const parsed = parseQuestion(
    "SPA 가격조정 방식인 Locked-Box와 Closing Accounts의 차이를 설명하시오."
  );
  assert.equal(parsed.format, "주관식");
  assert.deepEqual(parsed.choices, []);
});
