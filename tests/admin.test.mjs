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
      "대상회사가 방어수단을 발동했을 때 이를 무력화할 논거를 서술하시오.",
      "① 신주발행 무효의 소",
      "② 주주총회 결의 취소",
      "정답: ①",
      "해설: 방어수단의 법적 한계를 아는지",
    ].join("\n")
  );

  assert.equal(parsed.track, "dispute");
  assert.equal(parsed.format, "객관식");
  assert.deepEqual(parsed.choices, ["신주발행 무효의 소", "주주총회 결의 취소"]);
  assert.equal(parsed.answer, "①");
  assert.match(parsed.explanation, /법적 한계/);

  // Metadata and the withheld fields must not leak into the visible prompt
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

test("legacy rows still map onto the current taxonomy", async () => {
  const { normalizeTrack, courseLabel, COURSES } = await import(
    new URL("../lib/questions.ts", import.meta.url).href
  );

  // 개편 전에 저장된 값을 관리자 화면에 세울 때, 선택지에 없는 값이면
  // 빈칸이 되고 저장이 400으로 거부된다.
  for (const [legacy, expected] of [
    ["friendly", "brokerage"],
    ["hostile", "dispute"],
    ["control", "dispute"],
    ["family", "family-office"],
    ["club", "investor-club"],
  ]) {
    assert.equal(normalizeTrack(legacy), expected);
    assert.ok(COURSES.some((c) => c.slug === normalizeTrack(legacy)), `${legacy} must resolve to a listed course`);
    assert.notEqual(courseLabel(legacy), legacy);
  }
});



// ── DB 오류 해설 ─────────────────────────────────────────────────────────
const dbErrorUrl = new URL("../lib/db-error.ts", import.meta.url).href;
const { describeDbError, isMissingTable } = await import(dbErrorUrl);

test("표가 없다는 사실은 drizzle 이 감싼 안쪽에 있다", () => {
  // Drizzle 은 실패한 질의를 자기 오류로 감싸고 진짜 원인을 cause 에 넣는다.
  // 겉면만 보면 안내를 못 하고 "문제가 발생했습니다"만 남는다 — 실제로 그랬다.
  const inner = new Error('relation "articles" does not exist');
  inner.code = "42P01";
  const outer = new Error('Failed query: select "id" from "articles" where slug = $1');
  outer.cause = inner;

  assert.equal(/does not exist/.test(outer.message), false, "겉면에는 원인이 없다");
  assert.equal(isMissingTable(outer), true, "cause 까지 보면 알아낸다");
  assert.match(describeDbError(outer), /relation "articles" does not exist/);
  assert.match(describeDbError(outer), /42P01/);
});

test("표와 무관한 오류를 표 없음으로 오인하지 않는다", () => {
  const outer = new Error("Failed query: insert into articles");
  outer.cause = new Error("connection timed out");
  assert.equal(isMissingTable(outer), false);
  assert.match(describeDbError(outer), /connection timed out/);
});

test("cause 가 자기 자신을 가리켜도 멈춘다", () => {
  const loop = new Error("bad");
  loop.cause = loop;
  assert.match(describeDbError(loop), /bad/);
});
