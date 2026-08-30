import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function renderHtml(path) {
  const response = await render(path);
  assert.equal(response.status, 200, `${path} should render`);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  return response.text();
}

test("server-renders the main gate with both entrances", async () => {
  const html = await renderHtml("/");
  assert.match(html, /FRONTIER/i);
  assert.match(html, /TEN AI/i);
  // The gate's whole job: one door to each face
  assert.match(html, /href="\/company"/);
  assert.match(html, /href="\/academy"/);
});

test("server-renders the corporate homepage with all five business areas", async () => {
  const html = await renderHtml("/company");
  assert.match(html, /주요 업무/);
  assert.match(html, /운영원칙/);
  assert.match(html, /직원채용/);
  // ver2.2: 패밀리오피스·투자가 클럽도 메뉴와 페이지를 갖는다
  assert.match(html, /href="\/company\/business\/family-office"/);
  assert.match(html, /href="\/company\/business\/investor-club"/);
  // 가입 창구는 아카데미 하나뿐 — 홈페이지에 가입 메뉴를 두지 않는다
  assert.doesNotMatch(html, /<a[^>]*>\s*회원가입\s*<\/a>/);
});

test("business detail pages carry their curriculum", async () => {
  const html = await renderHtml("/company/business/brokerage");
  assert.match(html, /M&(amp;)?A 중개/);
  assert.match(html, /업무 커리큘럼/);
  assert.match(html, /MASTER TIP/);
});

test("the offline-only areas publish their intro but flag the web boundary", async () => {
  const html = await renderHtml("/company/business/investor-club");
  assert.match(html, /투자가 클럽/);
  assert.match(html, /웹 안내 범위/);
  // 공개 목차는 순화된 표현을 쓰고 원문 표현은 웹에 내보내지 않는다 (8장)
  assert.doesNotMatch(html, /은닉 기법/);
  assert.doesNotMatch(html, /택스 헤이븐/);
});

test("server-renders the academy at /academy", async () => {
  const html = await renderHtml("/academy");
  assert.match(html, /아카데미/);
  assert.match(html, /5레벨 체계/);
  // 회원 등급과 포인트 해설 정책이 실려 있다
  assert.match(html, /무료회원/);
  assert.match(html, /유료회원/);
  // …and answers/intent still never reach the public HTML
  assert.doesNotMatch(html, /모범답안 공개/);
});

test("the privacy policy page renders and is linked where data is collected", async () => {
  const html = await renderHtml("/privacy");
  assert.match(html, /개인정보처리방침/);
  assert.match(html, /수집하는 개인정보 항목/);
  // 양식이 있는 두 화면에서 방침으로 이어진다 (보고서 8장)
  const company = await renderHtml("/company");
  assert.match(company, /href="\/privacy"/);
  const academy = await renderHtml("/academy");
  assert.match(academy, /href="\/privacy"/);
});

test("the join and login screens render without Supabase configured", async () => {
  // 키가 없어도 화면이 죽지 않고 안내로 물러나야 한다 (DB 없이도 사이트가
  // 도는 기존 원칙과 같다)
  for (const path of ["/academy/join", "/academy/login"]) {
    const html = await renderHtml(path);
    assert.match(html, /회원가입|로그인/, `${path} should render`);
  }
});

test("member screens are kept out of search", async () => {
  for (const path of ["/academy/join", "/academy/login"]) {
    const html = await renderHtml(path);
    assert.match(html, /noindex/, `${path} should be noindex`);
  }
});

test("both sites carry the shared right-hand rail", async () => {
  for (const path of ["/company", "/academy"]) {
    const html = await renderHtml(path);
    assert.match(html, /site-rail/, `${path} should render the rail`);
  }
});

test("quiz detail pages 404 rather than guess when the database is absent", async () => {
  // DB 없이는 문제를 특정할 수 없다 — 빈 화면이나 오류 대신 404로 물러난다.
  // (정답·해설이 실릴 자리 자체가 만들어지지 않는다는 확인이기도 하다)
  const response = await render("/academy/quiz/1");
  assert.equal(response.status, 404);
});

test("answers, intent and explanations never reach the public HTML", async () => {
  // 불변 원칙 (보고서 4.3 · 8장): 정답·출제 의도·해설은 공개 데이터에서
  // 원천 배제된다. 서버 컴포넌트가 행 전체를 클라이언트 컴포넌트에 넘기면
  // 렌더하지 않아도 HTML 페이로드에 실려 나가므로 여기서 잡는다.
  for (const path of ["/academy", "/company", "/"]) {
    const html = await renderHtml(path);
    assert.doesNotMatch(html, /"answer"\s*:/, `${path} must not carry answers`);
    assert.doesNotMatch(html, /"intent"\s*:/, `${path} must not carry authoring intent`);
    assert.doesNotMatch(html, /"explanation"\s*:/, `${path} must not carry explanations`);
  }
});

test("copy protection is mounted on the public faces", async () => {
  for (const path of ["/", "/company", "/academy"]) {
    const html = await renderHtml(path);
    assert.match(html, /copy-guard|copyGuard|CopyGuard/i, `${path} should carry the copy guard`);
  }
});

test("the help page renders all its guidance sections", async () => {
  const html = await renderHtml("/academy/help");
  assert.match(html, /아카데미 이용 방법/);
  assert.match(html, /문제 풀이와 채점/);
  assert.match(html, /포인트와 해설/);
  assert.match(html, /유료회원 전환/);
  // 도움말도 회원 화면이므로 검색에서 빠진다
  assert.match(html, /noindex/);
  // 안내에도 정답·해설 본문이 실리지 않는다
  assert.doesNotMatch(html, /"answer"\s*:/);
  assert.doesNotMatch(html, /"explanation"\s*:/);
});

test("the theme picker is offered on public faces but not on admin", async () => {
  for (const path of ["/", "/company", "/academy"]) {
    const html = await renderHtml(path);
    assert.match(html, /theme-toggle/, `${path} should offer the theme picker`);
    // 세 테마가 모두 선택지로 있어야 한다
    assert.match(html, /엠버/);
    assert.match(html, /감청/);
    assert.match(html, /세피아/);
  }
  const admin = await renderHtml("/admin");
  assert.doesNotMatch(admin, /theme-toggle/, "admin must not carry the theme picker");
});
