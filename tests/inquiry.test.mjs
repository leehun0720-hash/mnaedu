import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { cleanSource, normalizeInquiryStatus, validateInquiry } from "../lib/inquiry.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf-8");

/**
 * 상담 신청.
 *
 * 회장 지적(2026-10-08): 문제를 읽다가 상담 신청을 했더니 화면이 첫 화면으로
 * 빠져나가고, 보낸 상담 내용을 확인할 수 없었다. 상담 신청을 관리할 곳도
 * 없었다.
 */

const ok = {
  area: "M&A 중개",
  name: "홍길동",
  org: "㈜예시",
  phone: "010-0000-0000",
  email: "a@example.com",
  message: "매각을 검토하고 있습니다.",
  source: "/business/brokerage",
  agree: true,
};

test("제대로 적은 신청은 받는다", () => {
  const out = validateInquiry(ok);
  assert.ok("value" in out);
  assert.equal(out.value.source, "/business/brokerage");
  assert.equal(out.value.org, "㈜예시");
});

test("이름 · 이메일 · 내용 · 동의가 빠지면 돌려보낸다", () => {
  assert.ok("error" in validateInquiry({ ...ok, name: "" }));
  assert.ok("error" in validateInquiry({ ...ok, email: "abc" }));
  assert.ok("error" in validateInquiry({ ...ok, message: "" }));
  assert.ok("error" in validateInquiry({ ...ok, agree: false }));
  assert.ok("error" in validateInquiry({ ...ok, message: "가".repeat(4001) }));
});

test("보낸 화면 주소는 사이트 안의 경로만 받는다", () => {
  // 관리자 화면에서 눌러 가 보시는 값이다 — 바깥 주소나 스크립트가 섞이면 안 된다
  assert.equal(cleanSource("/business/dispute"), "/business/dispute");
  assert.equal(cleanSource("https://evil.example"), null);
  assert.equal(cleanSource("//evil.example"), null);
  assert.equal(cleanSource("javascript:alert(1)"), null);
  assert.equal(cleanSource('/x"><script>'), null);
});

test("처리 상태는 정해진 넷뿐이다", () => {
  assert.equal(normalizeInquiryStatus("상담중"), "상담중");
  assert.equal(normalizeInquiryStatus("엉뚱한 값"), "접수");
});

test("양식은 화면을 떠나지 않고 서버로 보낸다", () => {
  const form = read("app/contact-form.tsx");
  assert.match(form, /fetch\("\/api\/inquiries"/);
  assert.doesNotMatch(form, /window\.location\.href\s*=/, "메일 프로그램으로 화면을 넘긴다");
  assert.match(form, /접수번호/, "보낸 뒤 접수번호와 내용을 보여 주지 않는다");
});

test("주요업무 화면은 그 자리에서 상담을 받는다", () => {
  const page = read("app/business/[slug]/page.tsx");
  assert.match(page, /<ContactForm defaultArea=\{area\.name\}/);
  assert.doesNotMatch(page, /href="\/#contact"[^>]*>\s*상담 신청하기/, "상담 신청이 첫 화면으로 빠져나간다");
});

test("상담 신청 표는 어느 길로 만들어지든 잠긴다", () => {
  // 성함 · 연락처 · 거래 이야기가 담긴다. 브라우저 쪽 역할이 읽으면 사고다.
  const setup = read("supabase/setup.sql");
  assert.match(setup, /ALTER TABLE "inquiries" ENABLE ROW LEVEL SECURITY;/);
  assert.match(setup, /REVOKE ALL ON TABLE "inquiries" FROM anon, authenticated;/);
  const db = read("lib/inquiries-db.ts");
  const ensure = db.slice(db.indexOf("export async function ensureInquiriesTable"), db.indexOf("export async function inquiredTooOften"));
  assert.match(ensure, /enable row level security/);
  assert.match(ensure, /revoke all on table "inquiries" from anon/);
  assert.match(ensure, /revoke all on table "inquiries" from authenticated/);
});

test("관리자 화면에 상담 신청 탭이 있다", () => {
  const client = read("app/admin/admin-client.tsx");
  assert.match(client, /goTab\("inquiries"\)/);
  assert.match(client, /<InquiriesTab /);
});
