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

test("server-renders the corporate homepage", async () => {
  const html = await renderHtml("/company");
  assert.match(html, /주요 업무/);
  assert.match(html, /운영원칙/);
  // Family office & investor club stay name-only: no detail routes exist
  assert.doesNotMatch(html, /href="\/company\/business\/family-office"/);
  assert.doesNotMatch(html, /href="\/company\/business\/investor-club"/);
});

test("server-renders a business detail page with its curriculum", async () => {
  const html = await renderHtml("/company/business/brokerage");
  assert.match(html, /M&(amp;)?A 중개/);
  assert.match(html, /업무 커리큘럼/);
});

test("server-renders the academy at /academy", async () => {
  const html = await renderHtml("/academy");
  assert.match(html, /아카데미/);
  // The 5-level ladder is on the page…
  assert.match(html, /5레벨 체계/);
  // …and answers/intent still never reach the public HTML
  assert.doesNotMatch(html, /모범답안 공개/);
});
