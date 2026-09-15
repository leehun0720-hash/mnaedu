import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/library-merge.ts", import.meta.url).href;
const { mergeLibrary } = await import(url);

// 회장 지시(2026-09-15): 각 분야 자료실에 글도 올라가야 한다. 파일(documents)과
// 글(articles)은 서로 다른 표에 있으므로, 화면에 세울 때 합친다. 합치는 순간
// 순서와 쪽 나누기가 어긋나기 쉬워 여기서 붙들어 둔다.

const entry = (key, createdAt, file) => ({
  key,
  title: key,
  summary: null,
  kind: file ? "자료" : "글",
  stage: null,
  trackLabel: null,
  createdAt,
  href: file ? `/api/documents/${key}` : `/insights/${key}`,
  file,
  size: file ? "1.0 MB" : "",
});

test("파일과 글이 한 목록에 날짜순으로 선다", () => {
  const out = mergeLibrary(
    [entry("옛파일", "2026-01-01", true), entry("새글", "2026-09-10", false), entry("중간파일", "2026-05-01", true)],
    10,
    0
  );
  assert.deepEqual(out.map((e) => e.key), ["새글", "중간파일", "옛파일"]);
});

test("같은 날 올린 것은 읽을 글이 앞에 선다", () => {
  const out = mergeLibrary([entry("파일", "2026-09-10", true), entry("글", "2026-09-10", false)], 10, 0);
  assert.deepEqual(out.map((e) => e.key), ["글", "파일"]);
});

test("쪽을 나눠도 순서가 이어진다", () => {
  const all = [
    entry("a", "2026-09-05", true),
    entry("b", "2026-09-04", false),
    entry("c", "2026-09-03", true),
    entry("d", "2026-09-02", false),
    entry("e", "2026-09-01", true),
  ];
  // 두 표에서 따로 끊어 오면 2쪽에서 순서가 어긋난다. 합친 뒤에 잘라야 한다.
  assert.deepEqual(mergeLibrary(all, 2, 0).map((e) => e.key), ["a", "b"]);
  assert.deepEqual(mergeLibrary(all, 2, 2).map((e) => e.key), ["c", "d"]);
  assert.deepEqual(mergeLibrary(all, 2, 4).map((e) => e.key), ["e"]);
  // 마지막 쪽을 넘어가면 빈 목록 — 화면이 터지지 않는다
  assert.deepEqual(mergeLibrary(all, 2, 6), []);
});

test("받은 목록을 제자리에서 흐트러뜨리지 않는다", () => {
  const all = [entry("a", "2026-01-01", true), entry("b", "2026-09-01", false)];
  const before = all.map((e) => e.key);
  mergeLibrary(all, 10, 0);
  assert.deepEqual(all.map((e) => e.key), before);
});

test("글은 읽는 주소로, 파일은 내려받는 주소로 간다", () => {
  const [post, file] = mergeLibrary([entry("글", "2026-09-10", false), entry("파일", "2026-09-09", true)], 10, 0);
  assert.equal(post.file, false);
  assert.match(post.href, /^\/insights\//);
  assert.equal(file.file, true);
  assert.match(file.href, /^\/api\/documents\//);
});
