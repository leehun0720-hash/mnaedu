import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");

/**
 * 회장 지적(2026-10-14): 글자가 너무 작고, 키우려고 「소제목」을 고르면 오히려
 * 작아진다. 정답 · 해설 머리표를 .qa-answer h3 로 걸어 두어, 본문 속 소제목까지
 * 12px 머리표 글씨가 되었기 때문이다.
 */
test("정답 · 해설 머리표는 본문 소제목과 이름이 다르다", () => {
  const css = read("app/globals.css");
  assert.doesNotMatch(css, /^\.qa-answer h3\s*\{/m, "본문 소제목이 머리표 글씨로 작아진다");
  assert.match(css, /\.qa-answer-label\s*\{/);
  const section = read("app/questions-section.tsx");
  assert.match(section, /<h3 className="qa-answer-label">정답<\/h3>/);
  assert.match(section, /<h3 className="qa-answer-label">해설<\/h3>/);
});

test("본문 소제목은 본문보다 크다", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.qa-answer > div h3 \{ font: 700 clamp\(17px/);
  assert.match(css, /\.qa-answer p,\n\.qa-answer li \{ font-size: clamp\(15\.5px/);
});
