import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");

/**
 * 데이터베이스 진단.
 *
 * 2026-10-02 에 Q&A 표가 잠겼다. 관리자 Q&A 탭은 「12초 안에 답하지 않았다」고만
 * 했고, 홈페이지는 15초를 기다린 끝에 회장이 올린 글 대신 처음의 여섯 질문을
 * 세웠다. 진단은 회원 표만 재고 있었고, 그 단추마저 회원 탭 안에 있었다.
 * 아래 검사는 그 세 가지가 되풀이되지 않게 한다.
 */

const route = read("app/api/admin/diagnose/route.ts");
const client = read("app/admin/admin-client.tsx");

test("진단은 화면에 쓰는 표를 빠짐없이 잰다", () => {
  const schema = read("db/schema.ts");
  const tables = [...schema.matchAll(/pgTable\(\s*"([a-z_]+)"/g)]
    .map((m) => m[1])
    // 로그인 기록과 비밀번호 표는 관리자 탭에 목록이 없다
    .filter((name) => !name.startsWith("admin_"));
  assert.ok(tables.includes("qna"), "schema 에서 표 이름을 읽지 못했다");
  for (const name of tables) {
    assert.match(route, new RegExp(`name: "${name}"`), `진단이 ${name} 표를 재지 않는다`);
  }
});

test("표를 읽어 볼 때 잠금을 기다리지 않는다", () => {
  // 기다리면 진단까지 잠긴 표 앞에서 갇히고, 「잠금 풀기」가 들어갈 연결이 없어진다
  assert.match(route, /set local lock_timeout = '1s'/);
});

test("잠금 풀기는 사람이 연 접속만 끊는다", () => {
  const unlock = route.slice(route.indexOf('body.action === "unlock"'), route.indexOf('body.action === "note"'));
  assert.match(unlock, /backend_type = 'client backend'/, "Supabase 의 일꾼 접속까지 끊을 수 있다");
  assert.match(unlock, /pg_backend_pid\(\)/, "진단하는 자기 자신을 끊을 수 있다");
});

test("진단 판은 탭 밖에 한 번만 서고, 멎은 오류 줄 옆에 단추가 있다", () => {
  assert.equal(client.match(/className="admin-card admin-diag"/g)?.length ?? 0, 1);
  assert.match(client, /무엇이 막혔는지 보기/);
  assert.match(client, /데이터베이스 진단/);
  assert.doesNotMatch(client, /회원 목록이 안 보일 때 — 진단/, "옛 회원 탭 카드가 남아 있다");
});
