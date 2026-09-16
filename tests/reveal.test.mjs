import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");

/**
 * .co-reveal 은 CSS 에서 opacity:0 으로 시작하고, Reveal 옵저버만이 그것을
 * 되돌린다. 그래서 옵저버가 없는 화면의 글은 HTML 안에 멀쩡히 있으면서도
 * 화면에서는 통째로 사라진다.
 *
 * 2026-09-16 에 실제로 그랬다. 업무 화면의 업무자료·평가문제가 그렇게 비어
 * 보였고, 회장의 컴퓨터만 예외였다 — 윈도우의 '동작 줄이기'가 켜져 있어
 * opacity 가 1로 되돌아갔기 때문이다. 아래 검사는 그 일이 되풀이되는 것을 막는다.
 */

test("나타나는 효과는 뿌리 레이아웃 한 곳에 달려 있다", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /import Reveal from ["']\.\/reveal["']/, "layout 이 Reveal 을 불러오지 않는다");
  assert.match(layout, /<Reveal\s*\/>/, "layout 이 Reveal 을 그리지 않는다");
});

test("화면마다 따로 달지 않는다 — 한 곳에서만 관리한다", () => {
  // 화면마다 달기 시작하면 빠뜨리는 화면이 생긴다. 그것이 이 고장의 원인이었다.
  const dir = new URL("../app/", import.meta.url);
  const offenders = [];
  const walk = (url, prefix = "") => {
    for (const entry of readdirSync(url, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(new URL(`${entry.name}/`, url), `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith(".tsx") && entry.name !== "reveal.tsx" && `${prefix}${entry.name}` !== "layout.tsx") {
        const src = readFileSync(new URL(entry.name, url), "utf-8");
        if (/<Reveal\s*\/>/.test(src)) offenders.push(`${prefix}${entry.name}`);
      }
    }
  };
  walk(dir);
  assert.deepEqual(offenders, [], `Reveal 은 layout.tsx 에만 둔다 — ${offenders.join(", ")} 에도 달려 있다`);
});

test("옵저버는 화면을 옮길 때마다 다시 훑는다", () => {
  // 뿌리 레이아웃은 화면을 옮겨도 다시 붙지 않는다. 의존성이 비어 있으면
  // 링크로 들어간 화면의 글이 영원히 투명하게 남는다.
  const src = read("app/reveal.tsx");
  assert.match(src, /usePathname/, "주소 변화를 보지 않는다");
  assert.match(src, /\}, \[pathname\]\)/, "효과가 주소 변화에 다시 돌지 않는다");
});

test("자바스크립트가 없는 환경에서는 글이 그대로 보인다", () => {
  const css = read("app/globals.css");
  const guarded = /@media \(scripting: enabled\)\s*\{\s*\.co-reveal \{\s*opacity: 0;/.test(css);
  assert.ok(guarded, "opacity:0 이 (scripting: enabled) 밖에 있으면 JS 없는 방문자는 빈 화면을 본다");
});
