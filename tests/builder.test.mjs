import assert from "node:assert/strict";
import test from "node:test";

const renderUrl = new URL("../lib/builder/render.ts", import.meta.url).href;
const exportUrl = new URL("../lib/builder/export.ts", import.meta.url).href;
const typesUrl = new URL("../lib/builder/types.ts", import.meta.url).href;
const templateUrl = new URL("../lib/builder/template.ts", import.meta.url).href;

const { escapeHtml, safeUrl, renderSite, themeVars } = await import(renderUrl);
const { exportHtml, parseDoc, serializeDoc } = await import(exportUrl);
const { SECTION_CATALOG, newSection, DEFAULT_THEME } = await import(typesUrl);
const { starterDoc, blankDoc } = await import(templateUrl);

test("시작 템플릿은 이 사이트의 골격을 그대로 담는다", () => {
  const doc = starterDoc();
  const kinds = doc.sections.map((s) => s.kind);
  for (const expected of ["header", "hero", "cards", "steps", "table", "board", "cta", "footer"]) {
    assert.ok(kinds.includes(expected), `${expected} 구역이 시작 템플릿에 없다`);
  }
  // 구역 id는 서로 달라야 선택·삭제가 엉키지 않는다
  const ids = new Set(doc.sections.map((s) => s.id));
  assert.equal(ids.size, doc.sections.length);
});

test("목록에 실린 구역은 모두 만들 수 있다", () => {
  for (const entry of SECTION_CATALOG) {
    const section = newSection(entry.kind);
    assert.equal(section.kind, entry.kind);
    // 빈 껍데기가 아니라 바로 보기 좋은 예시가 들어 있어야 한다
    const html = renderSite({ version: 1, title: "t", theme: DEFAULT_THEME, sections: [section] });
    assert.ok(html.length > 60, `${entry.kind} 구역이 거의 비어 있다`);
  }
});

test("사용자가 넣은 글자는 태그로 해석되지 않는다", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  const doc = blankDoc();
  doc.sections = [{ ...newSection("hero"), title: `<img src=x onerror="alert(1)">` }];
  const html = exportHtml(doc);
  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /&lt;img src=x onerror/);
});

test("이미지 주소는 http·data·같은 서버 경로만 통과한다", () => {
  assert.equal(safeUrl("https://example.com/a.png"), "https://example.com/a.png");
  assert.equal(safeUrl("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
  assert.equal(safeUrl("/logo.svg"), "/logo.svg");
  // 주소 자리에 스크립트가 끼면 배경·이미지가 실행 통로가 된다
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("data:text/html,<script>"), "");
});

test("편집 모드에서만 고쳐 쓸 자리 표시가 붙는다", () => {
  const doc = starterDoc();
  assert.match(renderSite(doc, true), /data-edit="sections\.1\.title"/);
  // 내보낸 결과물에는 편집 흔적이 남으면 안 된다
  assert.doesNotMatch(exportHtml(doc), /data-edit=/);
});

test("내보낸 파일은 혼자 서는 문서다", () => {
  const html = exportHtml(starterDoc());
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<meta name="viewport"/);
  // 스타일이 파일 안에 들어 있어야 어디에 올려도 그대로 뜬다
  assert.match(html, /\.bf-sec\{/);
  assert.match(html, /--bf-accent:#D8341A/);
});

test("게시판이 있으면 동작 스크립트가, 없으면 붙지 않는다", () => {
  const withBoard = exportHtml(starterDoc());
  assert.match(withBoard, /data-board="/);
  assert.match(withBoard, /localStorage\.getItem\("bf-board-"/);

  // 게시판이 없으면 스크립트 자체가 붙지 않아야 한다.
  // (스타일시트에는 .bf-board-* 규칙이 늘 들어 있으므로 <script>로 판별한다)
  const doc = blankDoc();
  doc.sections = [newSection("hero")];
  const html = exportHtml(doc);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /localStorage/);
});

test("게시판 글 본문은 내보낸 파일 안에 실려 나간다", () => {
  const doc = blankDoc();
  const board = newSection("board");
  board.posts = [
    { id: "p1", title: "제목", author: "관리자", date: "2026-09-01", body: "본문 내용입니다", notice: true },
  ];
  doc.sections = [board];
  const html = exportHtml(doc);
  assert.match(html, /data-post="p1" data-body="본문 내용입니다"/);
});

test("테마를 바꾸면 문서 전체 색이 함께 바뀐다", () => {
  const doc = starterDoc();
  doc.theme = { ...doc.theme, accent: "#123456", heading: "sans" };
  const vars = themeVars(doc.theme);
  assert.match(vars, /--bf-accent:#123456/);
  assert.match(vars, /--bf-heading:"Noto Sans KR"/);
  assert.match(exportHtml(doc), /--bf-accent:#123456/);
});

test("숨긴 구역은 결과물에서 빠진다", () => {
  const doc = blankDoc();
  doc.sections = [{ ...newSection("hero"), hidden: true }, newSection("footer")];
  const html = exportHtml(doc);
  assert.doesNotMatch(html, /bf-sec--hero/);
  assert.match(html, /bf-sec--footer/);
});

test("저장한 문서는 되읽히고, 남의 JSON은 거부된다", () => {
  const doc = starterDoc();
  const restored = parseDoc(serializeDoc(doc));
  assert.equal(restored.sections.length, doc.sections.length);
  assert.equal(restored.theme.accent, doc.theme.accent);
  // 형식이 아닌 파일을 불러오면 화면이 깨진다 — 문 앞에서 막는다
  assert.equal(parseDoc("그냥 글자"), null);
  assert.equal(parseDoc(JSON.stringify({ version: 9, sections: [], theme: {} })), null);
  assert.equal(parseDoc(JSON.stringify({ version: 1 })), null);
});
