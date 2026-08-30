import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const rulesUrl = new URL("../lib/grading-rules.ts", import.meta.url).href;
const { leaksSecret, aiMayGrade, AI_MAX_LEVEL } = await import(rulesUrl);

const ANSWER =
  "핵심 다섯 가지는 시장 진입 시간 단축과 검증된 매출 확보 그리고 면허 획득 인력 확보 규모의 경제이다";

test("겹침 검사는 옮겨 적은 정답을 잡아낸다", () => {
  // 주입에 성공한 모델은 원문을 통째로 베낀다 — 그 형태를 잡는다
  assert.equal(leaksSecret(`강평입니다. ${ANSWER} 잘 쓰셨습니다.`, [ANSWER]), true);
  // 정상 강평은 통과해야 한다 (과잉 차단은 기능을 죽인다)
  assert.equal(leaksSecret("결론은 분명하나 한계 조건에 대한 서술이 부족합니다.", [ANSWER]), false);
  // 빈 값과 null에 안전하다
  assert.equal(leaksSecret("", [ANSWER]), false);
  assert.equal(leaksSecret("아무 말", [null, ""]), false);
  // 짧은 출제 의도도 통째로 들어가면 잡힌다
  assert.equal(leaksSecret("이 문제는 방어수단의 한계를 아는지 봅니다", ["방어수단의 한계를 아는지"]), true);
});

test("회장이 출제한 레벨은 AI가 합격시키지 못한다", () => {
  // L4·L5는 회장 검수 영역 (보고서 4.2) — 주입으로 만점을 받아도
  // 통과 레벨이 올라가지 않도록 AI 채점 자체를 막는다
  assert.equal(aiMayGrade("입문"), true);
  assert.equal(aiMayGrade("실무"), true);
  assert.equal(aiMayGrade("상급"), false);
  assert.equal(aiMayGrade("마스터"), false);
  // 알 수 없는 난이도는 막는 쪽으로 기운다
  assert.equal(aiMayGrade("없는등급"), false);
  assert.equal(AI_MAX_LEVEL, 3);
});

test("비공개 자료가 수험자 글과 같은 턴에 붙지 않는다", async () => {
  // 회귀 방지 — 이 경계가 무너지면 프롬프트 주입으로 정답이 새어 나간다
  const src = await readFile(new URL("../lib/grading.ts", import.meta.url), "utf8");
  assert.match(src, /<answer>/, "수험자 글은 구분자로 감싸야 한다");
  assert.match(src, /leaksSecret\(feedback/, "강평은 대조 후에만 나가야 한다");
  assert.doesNotMatch(src, /\$\{rubric\}\\n\\n\[수험자 답안\]/,
    "모범답안과 수험자 글을 같은 턴에 붙이면 주입에 뚫린다");
});
