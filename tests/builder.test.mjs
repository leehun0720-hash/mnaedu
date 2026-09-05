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

const helpUrl = new URL("../lib/builder/help.ts", import.meta.url).href;
const { HELP_IDS, HELP_TOPICS, MANUAL } = await import(helpUrl);

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

test("화면에 「?」를 놓은 모든 자리에 사용법이 있다", () => {
  // 메뉴는 늘었는데 안내가 빠지는 일을 여기서 잡는다
  for (const id of HELP_IDS) {
    const topic = HELP_TOPICS[id];
    assert.ok(topic, `${id}에 사용법이 없다`);
    assert.ok(topic.title.length > 0, `${id}에 제목이 없다`);
    assert.ok(topic.lines.length > 0, `${id}에 설명이 없다`);
    for (const line of topic.lines) assert.ok(line.trim().length > 0, `${id}에 빈 줄이 있다`);
  }
  // 쓰이지 않는 안내가 남아 옛말이 되는 것도 막는다
  assert.deepEqual(Object.keys(HELP_TOPICS).sort(), [...HELP_IDS].sort());
});

test("매뉴얼은 구역 11종을 빠짐없이 설명한다", () => {
  const tables = MANUAL.flatMap((c) => c.blocks.filter((b) => b.kind === "table"));
  const listed = tables.flatMap((t) => t.rows.map((r) => r[0]));
  for (const entry of SECTION_CATALOG) {
    assert.ok(listed.includes(entry.name), `매뉴얼에 「${entry.name}」 설명이 없다`);
  }
});

test("매뉴얼 차례는 서로 겹치지 않는다", () => {
  // 차례 링크가 같은 id를 가리키면 엉뚱한 곳으로 넘어간다
  const ids = MANUAL.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const chapter of MANUAL) {
    assert.ok(chapter.title.length > 0);
    assert.ok(chapter.blocks.length > 0, `${chapter.id} 장이 비어 있다`);
  }
});

test("상단 메뉴는 로고 그림이 있으면 그림을, 없으면 네모를 세운다", () => {
  const doc = blankDoc();
  const header = newSection("header");
  doc.sections = [header];
  // 그림이 없을 때는 강조색 네모가 상표 자리를 지킨다.
  // (스타일시트에는 .bf-brand-img 규칙이 늘 있으므로 <img> 마크업으로 판별한다)
  assert.match(exportHtml(doc), /<span class="bf-brand-mark"/);
  assert.doesNotMatch(exportHtml(doc), /<img class="bf-brand-img"/);

  doc.sections = [{ ...header, logoImage: "data:image/png;base64,AAAA", logoHeight: 48 }];
  const html = exportHtml(doc);
  assert.match(html, /<img class="bf-brand-img" src="data:image\/png;base64,AAAA"/);
  assert.match(html, /style="height:48px"/);
  assert.doesNotMatch(html, /<span class="bf-brand-mark"/);
  // 로고 글자는 그림의 대체 텍스트로도 남는다
  assert.match(html, /alt="브랜드 이름"/);
});

test("로고 높이는 읽을 수 있는 범위를 벗어나지 않는다", () => {
  const doc = blankDoc();
  const header = { ...newSection("header"), logoImage: "https://example.com/logo.svg" };
  // 0이나 9999가 들어와도 화면이 무너지지 않아야 한다
  doc.sections = [{ ...header, logoHeight: 0 }];
  assert.match(exportHtml(doc), /height:34px/);
  doc.sections = [{ ...header, logoHeight: 9999 }];
  assert.match(exportHtml(doc), /height:120px/);
  doc.sections = [{ ...header, logoHeight: 8 }];
  assert.match(exportHtml(doc), /height:16px/);
});

test("로고 자리에도 이상한 주소는 실리지 않는다", () => {
  const doc = blankDoc();
  doc.sections = [{ ...newSection("header"), logoImage: "javascript:alert(1)" }];
  const html = exportHtml(doc);
  assert.doesNotMatch(html, /javascript:/);
  // 주소가 거부되면 네모가 대신 선다 — 상표 자리가 비지 않는다
  assert.match(html, /<span class="bf-brand-mark"/);
});

test("예전에 저장한 문서에도 로고 항목이 없어 탈이 나지 않는다", () => {
  // 로고 기능 이전에 저장해 둔 문서를 그대로 열어도 그려져야 한다
  const doc = blankDoc();
  const legacy = newSection("header");
  delete legacy.logoImage;
  delete legacy.logoHeight;
  doc.sections = [legacy];
  const html = exportHtml(doc);
  assert.match(html, /<span class="bf-brand-mark"/);
  assert.match(html, /bf-nav/);
});
