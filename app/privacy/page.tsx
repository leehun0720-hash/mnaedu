import Link from "next/link";
import type { Metadata } from "next";
import { CONTACT } from "@/lib/company";

export const metadata: Metadata = {
  title: "개인정보처리방침 | ㈜프론티어 M&A",
  description: "㈜프론티어 M&A 웹사이트의 개인정보 수집 항목, 이용 목적, 보유 기간 안내",
};

/**
 * 개인정보처리방침 (기획 보고서 8장 — 제작 범위에 포함된 항목).
 *
 * 현재 웹사이트는 회원 시스템과 서버 저장소 없이 운영되며, 모든 양식은
 * 방문자의 메일 프로그램을 통해 이메일로만 접수된다 — 방침도 그 사실
 * 그대로만 적는다. 아카데미 회원가입이 도입되면 항목·기간을 갱신한다.
 */
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. 총칙",
    body: [
      "㈜프론티어 M&A(이하 '당사')는 본 웹사이트(기업 홈페이지와 M&A 아카데미)를 이용하시는 분들의 개인정보를 소중히 다루며, 개인정보 보호법 등 관련 법령을 준수합니다. 본 방침은 웹사이트를 통해 접수되는 개인정보에 적용됩니다.",
    ],
  },
  {
    title: "2. 수집하는 개인정보 항목과 방법",
    body: [
      "문의 양식: 성함, 소속·직함, 연락처, 이메일 주소, 문의 내용",
      "오프라인 과정 문의(아카데미): 성함, 소속·직함, 이메일 주소",
      "채용 관련 문의: 성함, 연락처, 이메일 주소와 지원자가 스스로 제출하는 이력 정보",
      "현재 모든 양식은 작성 내용을 이용자 본인의 메일 프로그램으로 전달하는 방식으로 접수되며, 웹 서버에는 저장되지 않습니다. 접수된 정보는 당사 이메일로만 보관됩니다.",
    ],
  },
  {
    title: "3. 이용 목적",
    body: [
      "업무 상담과 문의에 대한 회신 및 개별 상담 일정 안내",
      "채용 절차 안내 및 진행",
      "아카데미 오프라인 과정 안내",
    ],
  },
  {
    title: "4. 보유 및 이용 기간",
    body: [
      "수집 목적이 달성되면 지체 없이 파기합니다. 문의 응대는 처리 완료 후, 채용 관련 정보는 해당 절차 종료 후 파기하며, 법령이 별도 보관을 요구하는 경우 그 기간을 따릅니다.",
    ],
  },
  {
    title: "5. 제3자 제공 및 처리 위탁",
    body: [
      "당사는 이용자의 개인정보를 제3자에게 제공하거나 외부에 처리를 위탁하지 않습니다. 향후 위탁이 필요한 경우 대상과 범위를 본 방침에 고지합니다.",
    ],
  },
  {
    title: "6. 쿠키 및 유사 기술",
    body: [
      "일반 방문자를 대상으로 하는 쿠키·추적 기술은 사용하지 않습니다. 관리자 화면 로그인에 한해 세션 쿠키가 사용되며, 방문 편의를 위한 비식별 브라우저 저장(첫 화면 연출 표시 여부) 외에는 이용자 기기에 정보를 남기지 않습니다.",
    ],
  },
  {
    title: "7. 이용자의 권리",
    body: [
      "이용자는 언제든지 본인 정보의 열람·정정·삭제를 아래 문의처로 요청하실 수 있으며, 당사는 지체 없이 조치합니다.",
    ],
  },
  {
    title: "8. 방침의 변경",
    body: [
      "아카데미 회원가입 등 새로운 수집 항목이 도입되면 본 방침을 갱신하고 시행 전에 웹사이트에 고지합니다.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="co-page">
      <header className="co-header">
        <Link className="co-brand" href="/company" aria-label="프론티어 M&A 기업 홈페이지로">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
          <img src="/logo-frontier-group.svg" alt="" width={34} height={30} aria-hidden="true" />
          <span className="co-brand-text">
            <b>㈜프론티어 M&amp;A</b>
            <i>FRONTIER M&amp;A · SINCE 1993</i>
          </span>
        </Link>
        <div className="co-header-actions">
          <Link className="co-academy-link" href="/company">
            기업 홈페이지 <i aria-hidden="true">→</i>
          </Link>
        </div>
      </header>

      <main>
        <section className="co-detail-hero">
          <p className="co-detail-en">PRIVACY POLICY</p>
          <h1>개인정보처리방침</h1>
          <p className="co-detail-lede">
            당사가 웹사이트에서 어떤 정보를 받고, 무엇에 쓰며, 언제 파기하는지를 안내합니다.
          </p>
        </section>

        <section className="co-section co-section--tint">
          <div className="co-legal">
            {SECTIONS.map((sec) => (
              <div key={sec.title} className="co-legal-item">
                <h2>{sec.title}</h2>
                {sec.body.map((b) => (
                  <p key={b.slice(0, 24)}>{b}</p>
                ))}
              </div>
            ))}

            <div className="co-legal-item">
              <h2>9. 문의처</h2>
              <p>
                ㈜프론티어 M&amp;A 개인정보 보호 담당 ·{" "}
                <a href={CONTACT.telHref}>{CONTACT.tel}</a> ·{" "}
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </p>
            </div>

            <p className="co-legal-date">시행일: 2026년 8월 28일</p>
          </div>
        </section>
      </main>

      <footer className="co-footer">
        <div className="co-footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A. ALL RIGHTS RESERVED.</small>
          <small>
            <Link href="/company">기업 홈페이지</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/academy">퀴즈 아카데미</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/">메인</Link>
          </small>
        </div>
      </footer>
    </div>
  );
}
