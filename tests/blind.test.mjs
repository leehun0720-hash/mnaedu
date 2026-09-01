import assert from "node:assert/strict";
import test from "node:test";

const url = new URL("../lib/questions.ts", import.meta.url).href;
const { OFFLINE_TRACKS, isOfflineTrack } = await import(url);

// 시크릿 오피스(패밀리오피스·투자가 클럽)는 오프라인 전용 — 문제은행 블라인드.
// 이 분류가 무너지면 공개 화면·풀이·해설 경로가 한꺼번에 뚫린다.

test("시크릿 오피스 두 분야는 오프라인 전용으로 분류된다", () => {
  assert.equal(isOfflineTrack("family-office"), true);
  assert.equal(isOfflineTrack("investor-club"), true);
  // 옛 슬러그로 저장된 문제도 같은 분야다
  assert.equal(isOfflineTrack("family"), true);
  assert.equal(isOfflineTrack("club"), true);
});

test("M&A 오피스 세 분야는 온라인 문제은행에 남는다", () => {
  assert.equal(isOfflineTrack("brokerage"), false);
  assert.equal(isOfflineTrack("dispute"), false);
  assert.equal(isOfflineTrack("financing"), false);
  // 옛 슬러그 중 M&A 오피스로 이어지는 것들도 막히지 않는다
  assert.equal(isOfflineTrack("friendly"), false);
  assert.equal(isOfflineTrack("hostile"), false);
});

test("DB 필터 목록은 현행·옛 슬러그를 모두 담는다", () => {
  // notInArray는 저장된 원문 값과 대조하므로, 옛 슬러그가 빠지면
  // 개편 전에 저장된 문제가 블라인드를 비켜 간다.
  for (const slug of ["family-office", "investor-club", "family", "club"]) {
    assert.ok(OFFLINE_TRACKS.includes(slug), `${slug}이(가) 필터 목록에 없다`);
  }
  // 온라인 분야가 잘못 들어가면 문제은행이 통째로 빈다
  for (const slug of ["brokerage", "dispute", "financing"]) {
    assert.ok(!OFFLINE_TRACKS.includes(slug), `${slug}이(가) 필터 목록에 들어 있다`);
  }
});
