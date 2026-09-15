import assert from "node:assert/strict";
import test from "node:test";

const renderUrl = new URL("../lib/builder/render.ts", import.meta.url).href;
const exportUrl = new URL("../lib/builder/export.ts", import.meta.url).href;
const typesUrl = new URL("../lib/builder/types.ts", import.meta.url).href;
const templateUrl = new URL("../lib/builder/template.ts", import.meta.url).href;

const { escapeHtml, safeUrl, renderSite, themeVars } = await import(renderUrl);
const { exportHtml, parseDoc, serializeDoc, downloadName } = await import(exportUrl);
const { SECTION_CATALOG, newSection, DEFAULT_THEME } = await import(typesUrl);
const { starterDoc, blankDoc, TEMPLATES, buildTemplate } = await import(templateUrl);

const brandUrl = new URL("../lib/builder/brand.ts", import.meta.url).href;
const { BRAND, BRAND_COLORS, GENERATOR } = await import(brandUrl);

const helpUrl = new URL("../lib/builder/help.ts", import.meta.url).href;
const { HELP_IDS, HELP_TOPICS, MANUAL, TOUR_STEPS } = await import(helpUrl);

test("시작 템플릿은 텐에이아이 골격을 그대로 담는다", () => {
  const doc = starterDoc();
  const kinds = doc.sections.map((s) => s.kind);
  for (const expected of ["header", "hero", "cards", "steps", "board", "cta", "footer"]) {
    assert.ok(kinds.includes(expected), `${expected} 구역이 시작 템플릿에 없다`);
  }
  // 구역 id는 서로 달라야 선택·삭제가 엉키지 않는다
  const ids = new Set(doc.sections.map((s) => s.id));
  assert.equal(ids.size, doc.sections.length);
  // 회사 이름과 사업영역이 실제로 실려 있어야 「전용」이라 할 수 있다
  const html = exportHtml(doc);
  assert.match(html, /TEN AI/);
  assert.match(html, /AX 컨설팅/);
});

test("템플릿은 모두 만들어지고 혼자 서는 문서로 나간다", () => {
  assert.ok(TEMPLATES.length >= 5, "고를 것이 너무 적다");
  const ids = TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, "템플릿 id가 겹친다");
  for (const entry of TEMPLATES) {
    assert.ok(entry.name.trim().length > 0, `${entry.id}에 이름이 없다`);
    assert.ok(entry.desc.trim().length > 0, `${entry.id}에 설명이 없다`);
    const doc = entry.build();
    assert.equal(doc.version, 1);
    assert.ok(doc.title.trim().length > 0, `${entry.id}에 사이트 이름이 없다`);
    // 빈 문서만 예외 — 나머지는 골격이 서 있어야 한다
    if (entry.id !== "blank") {
      assert.ok(doc.sections.length >= 5, `${entry.id} 골격이 너무 얇다`);
      const secIds = new Set(doc.sections.map((s) => s.id));
      assert.equal(secIds.size, doc.sections.length, `${entry.id}의 구역 id가 겹친다`);
    }
    const html = exportHtml(doc);
    assert.match(html, /^<!DOCTYPE html>/, `${entry.id}가 문서로 나가지 않는다`);
  }
  // 모르는 이름을 넘겨도 화면이 비지 않는다
  assert.ok(buildTemplate("없는-이름").sections.length > 0);
});

test("템플릿을 두 번 만들어도 구역 id가 겹치지 않는다", () => {
  // 같은 id가 두 문서에 걸리면 고르기·지우기가 엉킨다
  const a = starterDoc();
  const b = starterDoc();
  const overlap = a.sections.map((s) => s.id).filter((id) => b.sections.some((s) => s.id === id));
  assert.deepEqual(overlap, []);
});

test("고객 템플릿의 숫자는 채울 자리로 비워 둔다", () => {
  // 지어낸 실적이 그대로 고객 사이트에 나가는 일을 막는다
  const doc = buildTemplate("corp");
  const hero = doc.sections.find((s) => s.kind === "hero");
  for (const stat of hero.stats) {
    assert.match(stat.value, /○/, `「${stat.value}」는 비워 둔 자리가 아니다`);
  }
});

test("빌더에는 프론티어 흔적이 남지 않는다", () => {
  // 이 도구는 텐에이아이 것이다 — 옮겨 오며 남은 옛 이름을 여기서 잡는다
  for (const entry of TEMPLATES) {
    const html = exportHtml(entry.build());
    assert.doesNotMatch(html, /프론티어|FRONTIER|frontierexpert|mnaedu/i, `${entry.id}에 옛 이름이 남았다`);
  }
});

test("브랜드는 한곳에서 나오고 비어 있지 않다", () => {
  for (const key of ["product", "productEn", "company", "tagline", "site", "email"]) {
    assert.ok(String(BRAND[key]).trim().length > 0, `BRAND.${key}가 비어 있다`);
  }
  for (const key of ["primary", "deep", "cyan", "paper", "tint"]) {
    assert.match(BRAND_COLORS[key], /^#[0-9A-F]{6}$/i, `BRAND_COLORS.${key}가 색이 아니다`);
  }
  // 기본 테마는 브랜드 색을 쓴다 — 두 곳이 어긋나면 도구와 결과물의 색이 달라진다
  assert.equal(DEFAULT_THEME.accent, BRAND_COLORS.primary);
});

test("내보낸 파일은 무엇으로 만들었는지 스스로 말한다", () => {
  const html = exportHtml(starterDoc());
  assert.match(html, /<meta name="generator" content="TEN AI SITE BUILDER/);
  assert.ok(GENERATOR.includes(BRAND.site));
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
  assert.match(html, /--bf-accent:#0570DE/);
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

test("내려받는 파일 이름은 어떤 사이트 이름에도 견딘다", () => {
  assert.equal(downloadName("TEN AI 소개", "html"), "TEN AI 소개.html");
  // 슬래시가 들어가면 브라우저가 경로로 읽어 이름을 통째로 버린다
  assert.equal(downloadName("A/B 테스트", "html"), "A B 테스트.html");
  assert.equal(downloadName("보고서: 1차<초안>", "json"), "보고서 1차 초안.json");
  // 비어 있거나 지울 것뿐이면 물러날 이름이 있어야 한다
  assert.equal(downloadName("", "html"), "site.html");
  assert.equal(downloadName("///", "html"), "site.html");
  assert.equal(downloadName("...", "html"), "site.html");
  // 숨김 파일이 되거나 확장자가 겹치지 않는다
  assert.equal(downloadName(".hidden", "html"), "hidden.html");
  // 이름이 지나치게 길면 잘린다
  assert.ok(downloadName("가".repeat(300), "html").length <= 85);
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

test("따라 하기는 처음부터 끝까지 이어진다", () => {
  assert.ok(TOUR_STEPS.length >= 8, "걸음이 너무 적으면 따라 할 것이 없다");
  const ids = TOUR_STEPS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "걸음 id가 겹친다");
  for (const step of TOUR_STEPS) {
    assert.ok(step.title.trim().length > 0, `${step.id}에 제목이 없다`);
    assert.ok(step.body.trim().length > 0, `${step.id}에 설명이 없다`);
  }
  // 첫 걸음과 마지막 걸음은 화면을 짚지 않고 인사와 마무리를 한다
  assert.equal(TOUR_STEPS[0].target, undefined);
});

test("따라 하기가 짚는 자리는 화면에 실제로 있는 이름이다", () => {
  // 선택자가 어긋나면 조명만 사라지고 이유를 알 수 없다
  const known = [
    ".bf-sec--hero .bf-h1",
    ".bx-secs",
    ".bx-right",
    '[data-tour="logo"]',
    ".bx-catalog",
    ".bx-presets",
    '[data-tour="preview"]',
    '[data-tour="export"]',
    ".bx-manual-btn",
  ];
  for (const step of TOUR_STEPS) {
    if (!step.target) continue;
    assert.ok(known.includes(step.target), `${step.id}가 짚는 ${step.target}는 등록되지 않은 자리다`);
  }
});

test("화면을 준비시키는 지시는 정해진 것만 쓴다", () => {
  const allowed = ["tab:sections", "tab:add", "tab:theme", "select:header", "mode:edit"];
  for (const step of TOUR_STEPS) {
    if (!step.prepare) continue;
    assert.ok(allowed.includes(step.prepare), `${step.id}의 ${step.prepare}는 화면이 모르는 지시다`);
  }
});
