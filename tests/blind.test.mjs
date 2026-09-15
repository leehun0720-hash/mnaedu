import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/questions.ts", import.meta.url).href;
const { STAGES, normalizeStage, trackAliases, normalizeTrack, COURSES } = await import(url);
const company = new URL("../lib/company.ts", import.meta.url).href;
const { BUSINESS_AREAS } = await import(company);

/**
 * 2026-09-15 회장 지시로 규칙이 바뀌었다.
 *
 * 전에는 패밀리오피스·투자가 클럽을 분야째 블라인드했다. 이제 그 두 분야에서도
 * 출제하고 자료를 운용하시므로, 분야로 막던 것을 걷고 '발행' 하나가 그 자리를
 * 맡는다. 아래는 그 새 규칙과, 바뀌지 않은 것들을 붙들어 둔다.
 */

test("다섯 분야가 모두 문제은행에 오른다 — 분야로 막지 않는다", () => {
  // 코드 어디에도 분야 단위 차단이 남아 있지 않아야 한다. 남아 있으면
  // 회장이 시크릿 오피스에 출제하셔도 화면에 서지 않는다.
  assert.equal(COURSES.length, 5);
  for (const area of BUSINESS_AREAS) {
    assert.ok(
      COURSES.some((c) => c.slug === area.slug),
      `${area.name} 이(가) 출제 분야 목록에 없다`
    );
  }
});

test("오프라인 전용 표시는 남아 있다 — 안내 문구가 그것을 쓴다", () => {
  // 게시판을 막는 데는 더 쓰지 않지만, '웹 안내 범위' 고지는 이 표시로 세운다
  const secret = BUSINESS_AREAS.filter((b) => b.offlineOnly).map((b) => b.slug);
  assert.deepEqual(secret.sort(), ["family-office", "investor-club"]);
});

test("옛 슬러그로 저장된 것도 제 분야에서 보인다", () => {
  // 개편 전에 올린 문제·자료가 분야별 화면에서 사라지면 안 된다
  assert.ok(trackAliases("family-office").includes("family"));
  assert.ok(trackAliases("investor-club").includes("club"));
  assert.ok(trackAliases("brokerage").includes("friendly"));
  assert.ok(trackAliases("dispute").includes("hostile"));
  assert.ok(trackAliases("dispute").includes("control"));
  // 현행 값 자신도 늘 들어 있다
  for (const c of COURSES) assert.ok(trackAliases(c.slug).includes(c.slug));
});

test("옛 슬러그는 현행 분야로 읽힌다", () => {
  assert.equal(normalizeTrack("family"), "family-office");
  assert.equal(normalizeTrack("club"), "investor-club");
  assert.equal(normalizeTrack("brokerage"), "brokerage");
});

// ── 단계(기초·심화) ────────────────────────────────────────────────
// 폐지한 '레벨'과 혼동하면 안 된다. 단계는 잠그지도 세지도 않는 표시일 뿐이다.

test("단계는 기초와 심화 둘뿐이다", () => {
  assert.deepEqual([...STAGES], ["기초", "심화"]);
});

test("단계가 아닌 값은 '나누지 않음'으로 본다", () => {
  assert.equal(normalizeStage("기초"), "기초");
  assert.equal(normalizeStage("심화"), "심화");
  // 회장이 "1단계·2단계"로 부르시는 일이 잦다 — 그 말도 받는다
  assert.equal(normalizeStage("1단계"), "기초");
  assert.equal(normalizeStage("2단계"), "심화");
  assert.equal(normalizeStage(" 기초 "), "기초");
  for (const junk of ["", null, undefined, "상급", "입문", "3단계", "기초반"]) {
    assert.equal(normalizeStage(junk), null, `${junk} 는 단계가 아니다`);
  }
});
