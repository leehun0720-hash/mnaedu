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

test("server-renders the brand page at /", async () => {
  const html = await renderHtml("/");
  assert.match(html, /FRONTIER/i);
  assert.match(html, /주요 업무/);
  assert.match(html, /실무 문제/);
  assert.match(html, /자료실/);
  // 아카데미는 이름부터 사라졌다 — 회장이 "이건 학원"이라고 물린 지점이다
  assert.doesNotMatch(html, /아카데미/);
  assert.doesNotMatch(html, /href="\/academy/);
});

test("the five business areas each have a page", async () => {
  const html = await renderHtml("/");
  assert.match(html, /주요 업무/);
  assert.match(html, /운영원칙/);
  assert.match(html, /직원채용/);
  assert.match(html, /href="\/business\/family-office"/);
  assert.match(html, /href="\/business\/investor-club"/);
});

test("business detail pages carry their curriculum", async () => {
  const html = await renderHtml("/business/brokerage");
  assert.match(html, /M&(amp;)?A 중개/);
  assert.match(html, /업무 커리큘럼/);
  assert.match(html, /MASTER TIP/);
});

test("the offline-only areas publish their intro but flag the web boundary", async () => {
  const html = await renderHtml("/business/investor-club");
  assert.match(html, /투자가 클럽/);
  assert.match(html, /웹 안내 범위/);
  // 공개 목차는 순화된 표현을 쓰고 원문 표현은 웹에 내보내지 않는다 (8장)
  assert.doesNotMatch(html, /은닉 기법/);
  assert.doesNotMatch(html, /택스 헤이븐/);
});

test("첫 화면은 새 소식만 세우고, 자료·문제 본문은 업무 화면으로 넘긴다", async () => {
  // 회장 지시 1·1-1 — 첫 화면에서 실무문제·자료실 섹션을 걷어내고
  // 업무영역 바로 아래에 새로 올라온 것만 알리는 게시판을 둔다
  const html = await renderHtml("/");
  assert.match(html, /새로 올라온 자료와 문제/);
  assert.match(html, /id="updates"/);
  assert.doesNotMatch(html, /id="questions"/);
  assert.doesNotMatch(html, /id="library"/);
  // 폐지된 것들이 문구로도 남아 있지 않다
  for (const gone of [/레벨/, /포인트/, /유료회원/, /무료회원/, /승급/, /채점/]) {
    assert.doesNotMatch(html, gone, `${gone} should be gone from the page`);
  }
});

test("업무 화면이 그 분야의 업무자료와 평가문제를 싣는다", async () => {
  // 회장 지시 1·9 — 자료와 문제는 각 주요업무 화면에 붙는다
  const html = await renderHtml("/business/brokerage");
  assert.match(html, /M&(amp;)?A 중개 업무자료/);
  assert.match(html, /M&(amp;)?A 중개 평가문제/);
  // 지시 9 — '평가시험'이라는 옛 이름은 남지 않는다
  assert.doesNotMatch(html, /평가시험/);
  // 지시 10 — 공개 원칙 문구가 그대로 선다
  assert.match(html, /무료로 공개하는 것을 원칙으로 하며/);
  // 정답·해설은 어떤 경우에도 공개 화면에 실리지 않는다
  for (const leak of [/"answer":/, /"intent":/, /"explanation":/]) {
    assert.doesNotMatch(html, leak, `${leak} must never reach the public page`);
  }
});

test("시크릿 오피스 두 분야는 자료는 싣되 평가문제는 싣지 않는다", async () => {
  // 회장 지시 14·15 — 가입 안내는 세우고, 평가문제는 온라인에 두지 않는다.
  // 다만 업무자료는 모임을 소개하는 글이므로 그 분야에도 올릴 수 있어야 한다
  // (2026-09 회장 지적: "이 자료를 패밀리오피스 분야에 올리려는데 안 된다").
  for (const [slug, label, needle] of [
    ["family-office", "패밀리오피스", /패밀리오피스 운영전문가 모임은 온-라인 상에 공개하지 않는 것을 원칙으로/],
    ["investor-club", "투자가 클럽", /투자가 클럽 운영전문가의 오프-라인 모임은 온-라인 상에 공개하지 않는 것을 원칙으로/],
  ]) {
    const html = await renderHtml(`/business/${slug}`);
    assert.match(html, needle);
    assert.match(html, new RegExp(`${label} 업무자료`), `${slug}에 업무자료 칸이 서야 한다`);
    assert.doesNotMatch(html, new RegExp(`${label} 평가문제`));
    // 없는 칸으로 가는 표도 남기지 않는다
    assert.doesNotMatch(html, /평가문제 ↓/);
  }
});

test("the privacy policy page renders and is linked where data is collected", async () => {
  const html = await renderHtml("/privacy");
  assert.match(html, /개인정보처리방침/);
  assert.match(html, /수집하는 개인정보 항목/);
  // 양식이 있는 두 화면에서 방침으로 이어진다 (보고서 8장)
  const home = await renderHtml("/");
  assert.match(home, /href="\/privacy"/);
});

test("the join and login screens render without Supabase configured", async () => {
  // 키가 없어도 화면이 죽지 않고 안내로 물러나야 한다 (DB 없이도 사이트가
  // 도는 기존 원칙과 같다)
  for (const path of ["/join", "/login"]) {
    const html = await renderHtml(path);
    assert.match(html, /회원가입|로그인/, `${path} should render`);
  }
});

test("member screens are kept out of search", async () => {
  for (const path of ["/join", "/login"]) {
    const html = await renderHtml(path);
    assert.match(html, /noindex/, `${path} should be noindex`);
  }
});

test("the page carries the right-hand rail", async () => {
  const html = await renderHtml("/");
  assert.match(html, /site-rail/);
});

test("answers, intent and explanations never reach the public HTML", async () => {
  // 불변 원칙 (보고서 4.3 · 8장): 정답·출제 의도·해설은 공개 데이터에서
  // 원천 배제된다. 서버 컴포넌트가 행 전체를 클라이언트 컴포넌트에 넘기면
  // 렌더하지 않아도 HTML 페이로드에 실려 나가므로 여기서 잡는다.
  for (const path of ["/"]) {
    const html = await renderHtml(path);
    assert.doesNotMatch(html, /"answer"\s*:/, `${path} must not carry answers`);
    assert.doesNotMatch(html, /"intent"\s*:/, `${path} must not carry authoring intent`);
    assert.doesNotMatch(html, /"explanation"\s*:/, `${path} must not carry explanations`);
  }
});

test("copy protection is mounted on the public faces", async () => {
  for (const path of ["/"]) {
    const html = await renderHtml(path);
    assert.match(html, /copy-guard|copyGuard|CopyGuard/i, `${path} should carry the copy guard`);
  }
});

test("the theme picker is offered on public faces but not on admin", async () => {
  for (const path of ["/"]) {
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

test("the five areas are presented under the two offices", async () => {
  // 상단 분류: M&A 오피스(중개·분쟁·자금조달) / 시크릿 오피스(패밀리·클럽)
  for (const path of ["/"]) {
    const html = await renderHtml(path);
    assert.match(html, /M&(amp;)?A 오피스/, `${path} should show the M&A office`);
    assert.match(html, /시크릿 오피스/, `${path} should show the secret office`);
  }
  // 상세 페이지에는 소속 오피스 배지가 붙는다
  const secret = await renderHtml("/business/family-office");
  assert.match(secret, /시크릿 오피스/);
  const mna = await renderHtml("/business/brokerage");
  assert.match(mna, /M&(amp;)?A 오피스/);
});

test("업무 화면에서 기초·심화를 고를 수 있다", async () => {
  // 회장 지시(2026-09) — "M&A중개" 안에서 기초와 심화로 나뉘어야 한다
  const html = await renderHtml("/business/brokerage");
  assert.match(html, /단계 고르기/);
  // 한글 값은 주소에서 퍼센트 부호로 실린다 — 눈에 보이는 그대로 확인한다
  const 기초 = encodeURIComponent("기초");
  const 심화 = encodeURIComponent("심화");
  assert.ok(html.includes(`href="/business/brokerage?ds=${기초}#library"`), "자료 기초 링크");
  assert.ok(html.includes(`href="/business/brokerage?qs=${심화}#questions"`), "문제 심화 링크");
});

test("단계를 고른 채로도 화면이 선다", async () => {
  const html = await renderHtml("/business/brokerage?qs=%EA%B8%B0%EC%B4%88&ds=%EC%8B%AC%ED%99%94");
  assert.match(html, /M&(amp;)?A 중개 평가문제/);
  // 정답·해설은 어떤 조건에서도 공개 화면에 실리지 않는다
  for (const leak of [/"answer":/, /"explanation":/, /"intent":/]) {
    assert.doesNotMatch(html, leak);
  }
});
