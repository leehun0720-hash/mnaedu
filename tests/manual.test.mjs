import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildModuleSource, OUTPUT, renderDoc, SOURCES } from "../scripts/build-manual.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");

/**
 * 관리자 화면 「사용 안내」.
 *
 * 회장 지시(2026-10-02): 매뉴얼을 관리자 페이지에서 확인할 수 있게. 안내서는
 * 저장소의 마크다운에서 미리 만들어 둔다 — 원본을 고치고 다시 만들지 않으면
 * 화면은 낡은 안내를 보여 준다. 아래 첫 검사가 그것을 막는다.
 */

test("화면의 안내서가 원본 마크다운과 같다 — 고쳤으면 npm run manual", () => {
  const built = readFileSync(OUTPUT, "utf-8");
  assert.equal(built, buildModuleSource(), "ADMIN.md · MANUAL.md · SUPABASE.md 를 고친 뒤 npm run manual 을 돌리지 않았다");
});

test("세 안내서가 모두 실리고, 큰 제목마다 목차가 선다", () => {
  const built = read("app/admin/manual-content.ts");
  for (const s of SOURCES) {
    assert.match(built, new RegExp(`"id": "${s.id}"`), `${s.file} 가 빠졌다`);
    const markdown = read(s.file);
    const { toc } = renderDoc(s.id, markdown);
    const h2 = markdown.split("\n").filter((l) => /^## /.test(l)).length;
    assert.ok(h2 > 0 && toc.length >= h2, `${s.file} 목차가 큰 제목 수(${h2})보다 적다`);
  }
});

test("바깥 주소는 새 창으로 연다 — 관리자 화면을 잃지 않게", () => {
  const { html } = renderDoc("t", "[Q&A 화면](https://www.frontierexpert.com/qna) · https://mnaedu.vercel.app");
  const links = html.match(/<a [^>]*>/g) ?? [];
  assert.equal(links.length, 2);
  for (const a of links) assert.match(a, /target="_blank" rel="noopener noreferrer"/);
});

test("안내서에는 실제 키가 실리지 않는다", () => {
  // 관리자 화면의 스크립트 파일은 누구나 내려받을 수 있다. 안내서는 키의 이름과
  // 넣는 자리만 말하고, 값은 말하지 않는다.
  const built = read("app/admin/manual-content.ts");
  assert.doesNotMatch(built, /sb_secret_[A-Za-z0-9]{8,}/);
  assert.doesNotMatch(built, /sb_publishable_[A-Za-z0-9]{8,}/);
  assert.doesNotMatch(built, /sk-ant-[A-Za-z0-9-]{8,}/);
  assert.doesNotMatch(built, /postgres(ql)?:\/\/[^\s:@"]+:(?!\[)[^\s@"]+@/);
});

test("안내서는 탭을 열 때에만 불러온다", () => {
  const tab = read("app/admin/manual-tab.tsx");
  assert.match(tab, /import\("\.\/manual-content"\)/);
  assert.doesNotMatch(tab, /^import \{[^}]*MANUAL_DOCS/m, "안내서를 처음부터 함께 실어 보낸다");
  const client = read("app/admin/admin-client.tsx");
  assert.doesNotMatch(client, /from "\.\/manual-content"/);
  assert.match(client, /사용 안내/);
});
