import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");

/**
 * 자주 묻는 질문 — 쌓이는 게시판.
 *
 * 회장 지시(2026-10-02): 새로 올리면 전에 있던 질문이 사라지고 하나만 남는다.
 * 전에 한 질문도 계속 남아 게시판 형태로 있게 하라.
 *
 * 화면이 「표에 하나도 없으면 코드의 여섯, 하나라도 있으면 표의 것만」으로
 * 갈렸던 것이 원인이었다. 아래 검사는 그 갈림길이 돌아오지 않게 한다.
 */

const db = read("lib/qna-db.ts");

test("두 화면 모두 표에서 게시판을 읽고, 읽지 못할 때만 처음 여섯으로 물러난다", () => {
  for (const page of ["app/page.tsx", "app/qna/page.tsx"]) {
    const src = read(page);
    assert.match(src, /getFaqBoard\(/, `${page} 가 자주 묻는 질문 게시판을 읽지 않는다`);
    assert.match(src, /\?\? fallbackFaqBoard\(/, `${page} 의 물러남이 읽기 실패에만 걸려 있지 않다`);
    assert.doesNotMatch(src, /faqRows\.length\s*\?/, `${page} 에 옛 갈림길이 남아 있다`);
    assert.match(src, /<FaqBoardList /, `${page} 가 게시판 모양으로 그리지 않는다`);
  }
});

test("처음 여섯은 한 번만 넣고, 넣었다는 기록을 남긴다", () => {
  // 기록 없이 「여섯이 없으면 넣는다」로 하면, 회장이 지우신 여섯이 다음 글과 함께 되살아난다
  const seed = db.slice(db.indexOf("export async function ensureDefaultFaqs"), db.indexOf("function faqFilter"));
  assert.match(seed, /SEED_MARK/);
  assert.match(seed, /pg_advisory_xact_lock/, "두 요청이 함께 넣으면 여섯이 두 벌 들어간다");
  assert.match(seed, /lock_timeout/, "표가 잠겨 있을 때 첫 화면이 기다리게 된다");
});

test("기록 행은 어느 목록에도, 어느 손길에도 닿지 않는다", () => {
  const list = db.slice(db.indexOf("export async function listQna"), db.indexOf("function sqlNoAnswer"));
  assert.match(list, /\[notSystem\(\)\]/, "관리자 목록에 기록 행이 선다");
  assert.equal((list.match(/notSystem\(\)/g) ?? []).length, 3, "답변대기·미게시 숫자에 기록 행이 섞인다");
  const update = db.slice(db.indexOf("export async function updateQna"), db.indexOf("export async function deleteQna"));
  assert.match(update, /notSystem\(\)/);
  const del = db.slice(db.indexOf("export async function deleteQna"));
  assert.match(del, /notSystem\(\)/);
  assert.match(db.slice(db.indexOf("function faqFilter")), /notSystem\(\)/);
});

test("관리자가 첫 글을 올리기 전에 여섯을 먼저 넣는다", () => {
  const route = read("app/api/admin/qna/route.ts");
  const post = route.slice(route.indexOf("export async function POST"), route.indexOf("export async function PUT"));
  assert.ok(post.indexOf("ensureDefaultFaqs()") > -1 && post.indexOf("ensureDefaultFaqs()") < post.indexOf("createAdminQna("));
});

test("올릴 곳은 둘 중 하나를 고르고, 단추 이름이 고른 곳을 말한다", () => {
  // 회장 질문(2026-10-02): 「자주 묻는 질문으로 — 끄면 게시판에 섭니다」 상태에서
  // 올리기를 누르면 어디로 가느냐. 체크 칸 하나로는 답이 화면에 없었다.
  const client = read("app/admin/admin-client.tsx");
  assert.doesNotMatch(client, /끄면 게시판에 섭니다/);
  assert.equal((client.match(/name="qna-place"/g) ?? []).length, 2);
  assert.match(client, /qnaNewFaq \? "자주 묻는 질문에 올리기" : "게시판에 올리기"/);
});
