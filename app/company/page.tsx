import Link from "next/link";
import type { Metadata } from "next";
import { ABOUT, BUSINESS_AREAS, CONTACT, FAQS, PRINCIPLES, SLOGAN } from "@/lib/company";
import Reveal from "./reveal";

export const metadata: Metadata = {
  title: "㈜프론티어 M&A | 기업 홈페이지",
  description:
    "1993년 국내 최초로 설립된 M&A 전문회사 — M&A 중개, 경영권 분쟁, M&A 자금조달 자문. 검토 단계부터 NDA 체결을 원칙으로 합니다.",
};


const NAV = [
  { href: "#about", label: "회사소개" },
  { href: "#business", label: "주요업무" },
  { href: "#insight", label: "인사이트" },
  { href: "#faq", label: "Q&A" },
  { href: "#careers", label: "채용" },
  { href: "#contact", label: "문의" },
] as const;

export default function CompanyPage() {
  return (
    <div className="co-page">
      <header className="co-header">
        <a className="co-brand" href="/company" aria-label="프론티어 M&A 기업 홈페이지 처음으로">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
          <img src="/logo-frontier-group.svg" alt="" width={34} height={30} aria-hidden="true" />
          <span className="co-brand-text">
            <b>㈜프론티어 M&amp;A</b>
            <i>FRONTIER M&amp;A · SINCE 1993</i>
          </span>
        </a>
        <nav className="co-nav" aria-label="기업 홈페이지 메뉴">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="co-header-actions">
          {/* 아카데미로 건너가는 유일한 문(기획서 2장) */}
          <Link className="co-academy-link" href="/academy">
            아카데미 <i aria-hidden="true">↗</i>
          </Link>
        </div>
      </header>

      {/* 모바일 — 고정 헤더 아래 가로 스크롤 메뉴 */}
      <nav className="co-subnav" aria-label="섹션 바로가기">
        {NAV.map((n) => (
          <a key={n.href} href={n.href}>
            {n.label}
          </a>
        ))}
      </nav>

      <main>
        {/* ── 메인: 회장 원고의 슬로건이 곧 회사의 첫마디다 ─────────────── */}
        <section className="co-hero">
          <p className="co-hero-eyebrow">
            <span aria-hidden="true" /> KOREA&rsquo;S FIRST M&amp;A ADVISORY · SINCE 1993
          </p>
          <h1>
            국내 최초의
            <br />
            <em>M&amp;A 전문회사</em>
          </h1>
          <p className="co-hero-lede">{SLOGAN}</p>
          <div className="co-hero-actions">
            <a className="co-btn co-btn--primary" href="#contact">
              상담 신청하기 <i aria-hidden="true">→</i>
            </a>
            <a className="co-btn co-btn--ghost" href="#business">
              주요 업무 보기 <i aria-hidden="true">↓</i>
            </a>
          </div>
          <ul className="co-hero-strip" aria-label="핵심 키워드">
            <li>M&amp;A 중개</li>
            <li>경영권 분쟁</li>
            <li>M&amp;A 자금조달</li>
            <li>PMI</li>
          </ul>
        </section>

        {/* ── 회사소개 ──────────────────────────────────────────────── */}
        <section className="co-section" id="about">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">01 · ABOUT</p>
            <h2>㈜프론티어 M&amp;A는?</h2>
          </div>
          <div className="co-about co-reveal">
            <p className="co-about-body">{ABOUT}</p>
            <dl className="co-about-facts">
              <div>
                <dt>설립</dt>
                <dd>1993년 · 국내 최초 M&amp;A 전문회사</dd>
              </div>
              <div>
                <dt>업무 영역</dt>
                <dd>M&amp;A 중개 · 경영권 분쟁 · 자금조달 · PMI</dd>
              </div>
              <div>
                <dt>업무 원칙</dt>
                <dd>검토 단계부터 NDA 체결</dd>
              </div>
            </dl>
          </div>

          <div className="co-principles co-reveal">
            <h3>
              운영원칙 <span>5대 원칙을 바탕으로 업무를 진행합니다</span>
            </h3>
            <ol className="co-principle-grid">
              {PRINCIPLES.map((p) => (
                <li key={p.no} className="co-principle">
                  <span className="co-principle-no" aria-hidden="true">
                    {String(p.no).padStart(2, "0")}
                  </span>
                  <strong>{p.title}</strong>
                  <i>{p.en}</i>
                  <p>{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 주요업무 5 ─────────────────────────────────────────────── */}
        <section className="co-section co-section--tint" id="business">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">02 · BUSINESS</p>
            <h2>주요 업무</h2>
            <p className="co-section-note">
              패밀리오피스와 투자가 클럽은 홈페이지에서 상세 내용을 안내하지 않습니다.
            </p>
          </div>
          <div className="co-biz-grid co-reveal">
            {BUSINESS_AREAS.map((b) =>
              b.open ? (
                <Link key={b.slug} className="co-biz co-biz--open" href={`/company/business/${b.slug}`}>
                  <span className="co-biz-en">{b.en}</span>
                  <strong>{b.name}</strong>
                  <p>{b.line}</p>
                  <span className="co-biz-cta">
                    업무 소개 <i aria-hidden="true">→</i>
                  </span>
                </Link>
              ) : (
                // 웹 부재 원칙 — 명칭 한 줄만, 상세 페이지 없음
                <div key={b.slug} className="co-biz co-biz--closed">
                  <span className="co-biz-en">{b.en}</span>
                  <strong>{b.name}</strong>
                  <p>{b.line}</p>
                  <span className="co-biz-lock">PRIVATE</span>
                </div>
              )
            )}
          </div>
        </section>

        {/* ── 인사이트 ──────────────────────────────────────────────── */}
        <section className="co-section" id="insight">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">03 · INSIGHT</p>
            <h2>인사이트</h2>
          </div>
          <div className="co-insight co-reveal">
            <div className="co-insight-main">
              <strong>회장 칼럼 아카이브</strong>
              <p>
                아주경제 연재 100회 이상을 비롯한 칼럼 아카이브를 이곳으로 옮기고 있습니다. 이관이
                끝나는 대로 주 1회 새 글이 발행됩니다.
              </p>
            </div>
            <ul className="co-insight-list" aria-label="칼럼 아카이브 준비 현황">
              <li>
                <span>아주경제 칼럼 연재 (100회 이상)</span>
                <i>아카이브 이관 중</i>
              </li>
              <li>
                <span>신규 칼럼 주 1회 발행</span>
                <i>이관 완료 후 시작</i>
              </li>
            </ul>
          </div>
        </section>

        {/* ── Q&A ──────────────────────────────────────────────────── */}
        <section className="co-section co-section--tint" id="faq">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">04 · Q&amp;A</p>
            <h2>자주 묻는 질문</h2>
          </div>
          <div className="co-faq co-reveal">
            {FAQS.map((f) => (
              <details key={f.q} className="co-faq-item">
                <summary>
                  <span>{f.q}</span>
                  <i aria-hidden="true">+</i>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── 채용 ─────────────────────────────────────────────────── */}
        <section className="co-section" id="careers">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">05 · CAREERS</p>
            <h2>인재 영입</h2>
          </div>
          <div className="co-careers co-reveal">
            <p className="co-careers-lede">
              당사는 M&amp;A 업무의 다양한 분야에서 근무할 임직원을 수시 채용하고 있습니다.
            </p>
            <ul className="co-careers-points">
              <li>
                <strong>채용 시험</strong>
                <p>
                  지원 전에 임직원 채용시험(80점 이상)을 통과해야 합니다. 시험은 글로벌 M&amp;A
                  전문가 양성을 목표로 하므로 영문으로 출제됩니다.
                </p>
              </li>
              <li>
                <strong>화이트북 우대</strong>
                <p>
                  본인이 수행한 업무를 스스로 기록·검증한 화이트북(White Book)을 지참한 지원자를
                  우대합니다. 실적의 진위는 화이트북 한 권으로 드러난다고 믿기 때문입니다.
                </p>
              </li>
              <li>
                <strong>지원 방법</strong>
                <p>
                  이력서와 함께 아래 문의처(이메일)로 지원 의사를 보내주시면 채용 절차를 개별
                  안내드립니다.
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* ── 문의 ─────────────────────────────────────────────────── */}
        <section className="co-section co-section--contact" id="contact">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">06 · CONTACT</p>
            <h2>문의</h2>
          </div>
          <div className="co-contact co-reveal">
            <div className="co-contact-copy">
              <p>
                M&amp;A 중개, 경영권 분쟁, M&amp;A 자금조달을 비롯한 모든 업무 문의를 받고
                있습니다. 검토 단계부터 비밀유지약정(NDA) 체결을 원칙으로 하니 안심하고
                상담하시기 바랍니다.
              </p>
              <a className="co-btn co-btn--primary" href={`mailto:${CONTACT.email}`}>
                이메일로 문의하기 <i aria-hidden="true">→</i>
              </a>
            </div>
            <address className="co-contact-card">
              <dl>
                <div>
                  <dt>주소</dt>
                  <dd>
                    {CONTACT.addressLines[0]}
                    <br />
                    {CONTACT.addressLines[1]}
                  </dd>
                </div>
                <div>
                  <dt>전화</dt>
                  <dd>
                    <a href={CONTACT.telHref}>{CONTACT.tel}</a>
                  </dd>
                </div>
                <div>
                  <dt>이메일</dt>
                  <dd>
                    <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                  </dd>
                </div>
              </dl>
            </address>
          </div>
        </section>
      </main>

      <footer className="co-footer">
        <div className="co-footer-inner">
          <div className="co-footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
            <img src="/logo-frontier-group.svg" alt="" width={30} height={26} aria-hidden="true" />
            <span>
              <b>㈜프론티어 M&amp;A</b>
              <i>Mergers · Acquisitions · Divestitures · Epochmaking</i>
            </span>
          </div>
          <nav className="co-footer-nav" aria-label="푸터 메뉴">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}>
                {n.label}
              </a>
            ))}
            <Link href="/">메인 게이트</Link>
          </nav>
        </div>
        <div className="co-footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A. ALL RIGHTS RESERVED.</small>
          <small>
            SITE BY <a href="https://tenai.kr" target="_blank" rel="noopener noreferrer">TEN AI</a>
          </small>
        </div>
      </footer>

      <Reveal />
    </div>
  );
}
