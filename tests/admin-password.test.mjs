import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/password-hash.ts", import.meta.url).href;
const { hashPassword, matchesHash, checkNewPassword, MIN_PASSWORD_LENGTH } = await import(url);

test("비밀번호는 되돌릴 수 없는 형태로 담기고, 맞을 때만 통과한다", async () => {
  const stored = await hashPassword("correct-horse-battery");
  // 저장된 값에 원문이 남아 있으면 표가 새는 순간 비밀번호가 그대로 나간다
  assert.doesNotMatch(stored, /correct-horse-battery/);
  assert.match(stored, /^pbkdf2\$\d+\$/);

  assert.equal(await matchesHash("correct-horse-battery", stored), true);
  assert.equal(await matchesHash("correct-horse-batterY", stored), false);
  assert.equal(await matchesHash("", stored), false);
  // 공백 한 칸도 다른 비밀번호다 — 다듬어 주지 않는다
  assert.equal(await matchesHash("correct-horse-battery ", stored), false);
});

test("같은 비밀번호라도 저장된 값은 매번 다르다", async () => {
  const a = await hashPassword("same-password-here");
  const b = await hashPassword("same-password-here");
  // 소금이 매번 새로 뽑히므로, 표를 훔쳐도 한 번에 여럿을 풀 수 없다
  assert.notEqual(a, b);
  assert.equal(await matchesHash("same-password-here", a), true);
  assert.equal(await matchesHash("same-password-here", b), true);
});

test("망가진 저장값은 통과시키지 않는다", async () => {
  for (const broken of ["", "plain-text", "pbkdf2$$$", "bcrypt$10$abc$def", "pbkdf2$1$salt$hash"]) {
    assert.equal(await matchesHash("anything", broken), false, `${broken}가 통과했다`);
  }
});

test("새 비밀번호 규칙은 길이를 먼저 본다", () => {
  assert.equal(checkNewPassword("짧다", "old-password-1"), "too-short");
  assert.equal(checkNewPassword("x".repeat(201), "old-password-1"), "too-long");
  assert.equal(checkNewPassword("old-password-1", "old-password-1"), "same-as-current");
  // 같은 글자만 반복하면 길이만 채운 것이다
  assert.equal(checkNewPassword("aaaaaaaaaaaa", "old-password-1"), "no-variety");
  assert.equal(checkNewPassword("new-password-2026", "old-password-1"), null);
  // 경계: 최소 길이 바로 아래와 위
  assert.equal(checkNewPassword("ab3d5f7h9".slice(0, MIN_PASSWORD_LENGTH - 1), "x"), "too-short");
  assert.equal(checkNewPassword("ab3d5f7h9j", "x"), null);
});
