import Link from "next/link";
import type { Metadata } from "next";
import {
  ABOUT,
  BUSINESS_AREAS,
  OFFICES,
  areasInOffice,
  CAREERS,
  CONTACT,
  FAQS,
  PRINCIPLES,
  SLOGAN,
  TOTAL_TOPICS,
} from "@/lib/company";
import CopyGuard from "./copy-guard";
import ThemeToggle from "./theme-toggle";
import SiteRail from "./site-rail";
import ContactForm from "./contact-form";
import Reveal from "./reveal";
import QuestionsSection from "./questions-section";
import LibrarySection from "./library-section";
import { getPublicQuestions } from "@/lib/questions-db";
import { getPublicDocuments } from "@/lib/documents";
import { getCurrentMember } from "@/lib/members";
import { countPublishedArticles, getPublishedArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "㈜프론티어 M&A",
  description:
    "1993년 국내 최초로 설립된 M&A 전문회사 — M&A 중개, 경영권 분쟁, M&A 자금조달, 패밀리오피스, 투자가 클럽 자문. 검토 단계부터 NDA 체결을 원칙으로 합니다.",
};

// 한 페이지 안에서 움직인다 — 사이트가 하나로 합쳐지면서 별도 진입 메뉴는 사라졌다
const NAV = [
  { href: "#about", label: "회사소개" },
  { href: "#business", label: "주요업무" },
  { href: "#questions", label: "실무문제" },
  { href: "#library", label: "자료실" },
  { href: "#careers", label: "직원채용" },
  { href: "#faq", label: "Q&A" },
  { href: "#contact", label: "문의사항" },
] as const;

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [questions, documents, member, latestArticles, articleCount] = await Promise.all([
    getPublicQuestions(),
    getPublicDocuments(),
    getCurrentMember(),
    getPublishedArticles(3),
    countPublishedArticles(),
  ]);
  const signedIn = member !== null;

  return (
    <div className="co-page">
      <CopyGuard />
      <ThemeToggle />
      <SiteRail signedIn={signedIn} />

      <header className="co-header">
        <Link className="co-brand" href="/" aria-label="㈜프론티어 M&A 처음으로">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
          <img src="/logo-frontier-group.svg" alt="" width={34} height={30} aria-hidden="true" />
          <span className="co-brand-text">
            <b>㈜프론티어 M&amp;A</b>
            <i>FRONTIER M&amp;A · SINCE 1993</i>
          </span>
        </Link>
        <nav className="co-nav" aria-label="기업 홈페이지 메뉴">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="co-header-actions">
          <a className="co-cta-link" href="#contact">
            상담신청 <i aria-hidden="true">→</i>
          </a>
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
        {/* ── 메인: 설계서 슬로건이 곧 회사의 첫마디다 ─────────────────── */}
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
          <ul className="co-hero-strip" aria-label="주요 업무">
            {BUSINESS_AREAS.map((b) => (
              <li key={b.slug}>{b.name}</li>
            ))}
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
                <dd>중개 · 경영권 분쟁 · 자금조달 · 패밀리오피스 · 투자가 클럽</dd>
              </div>
              <div>
                <dt>업무 원칙</dt>
                <dd>검토 단계부터 NDA 체결</dd>
              </div>
            </dl>
          </div>

          {/* 기사·칼럼 — 실제 발행된 글에서 온다. 없으면 준비 중으로 안내한다. */}
          <div className="co-insight co-reveal">
            <div className="co-insight-main">
              <strong>기사 · 칼럼</strong>
              <p>
                {articleCount > 0
                  ? `성보경 회장이 아주경제 등에 연재한 글을 옮겨 싣고 있습니다. 현재 ${articleCount}편.`
                  : "아주경제 연재 100회 이상을 비롯한 회장 칼럼과 언론 기사를 이곳으로 옮기고 있습니다."}
              </p>
              <Link className="co-insight-more" href="/insights">
                전체 보기 <i aria-hidden="true">→</i>
              </Link>
            </div>
            {latestArticles.length > 0 ? (
              <ul className="co-insight-list" aria-label="최근 기사·칼럼">
                {latestArticles.map((a) => (
                  <li key={a.id}>
                    <Link href={`/insights/${encodeURIComponent(a.slug)}`}>
                      <span>{a.title}</span>
                      <i>{a.source ? `${a.source} · ${a.date}` : a.date}</i>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="co-insight-list" aria-label="기사·칼럼 준비 현황">
                <li>
                  <span>아주경제 칼럼 연재 (100회 이상)</span>
                  <i>아카이브 이관 중</i>
                </li>
              </ul>
            )}
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

          <p className="co-consult-line co-reveal">
            <a className="co-btn co-btn--ghost" href="#contact">
              상담 신청하기 <i aria-hidden="true">→</i>
            </a>
          </p>
        </section>

        {/* ── 주요업무 — M&A 오피스(3분야) · 시크릿 오피스(2분야) ────── */}
        <section className="co-section co-section--tint" id="business">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">02 · BUSINESS</p>
            <h2>주요 업무</h2>
            <p className="co-section-note">
              M&amp;A 오피스 3개 분야와 시크릿 오피스 2개 분야, 합계 {TOTAL_TOPICS}개 주제를
              다룹니다. 각 주제의 업무자료는 자료실에, 실제 판단이 갈렸던 지점은 실무 문제에
              올려 둡니다.
            </p>
          </div>
          {OFFICES.map((office) => (
            <div key={office.id} className="co-office co-reveal">
              <div className="co-office-head">
                <p className="co-office-en">{office.en}</p>
                <h3>
                  {office.name} <small>{areasInOffice(office.id).length}개 분야</small>
                </h3>
                <p className="co-office-line">{office.line}</p>
              </div>
              <div className="co-biz-grid">
                {areasInOffice(office.id).map((b) => (
                  <Link key={b.slug} className="co-biz co-biz--open" href={`/business/${b.slug}`}>
                    <span className="co-biz-en">{b.en}</span>
                    <strong>{b.name}</strong>
                    <p>{b.line}</p>
                    <span className="co-biz-foot">
                      <span className="co-biz-count">{b.curriculum.length}개 주제</span>
                      {/* 시크릿 오피스는 세부를 웹에 두지 않는다 (보고서 3.5) */}
                      {b.offlineOnly && <span className="co-biz-lock">상담 후 오프라인</span>}
                      <i aria-hidden="true">→</i>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── 직원채용 ─────────────────────────────────────────────── */}
        <section className="co-section" id="careers">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">03 · CAREERS</p>
            <h2>직원채용</h2>
          </div>
          <div className="co-careers co-reveal">
            <p className="co-careers-lede">{CAREERS.lede}</p>
            <ul className="co-careers-points">
              <li>
                <strong>채용시험 통과 (80점 이상)</strong>
                <p>{CAREERS.gate}</p>
              </li>
              <li>
                <strong>영문 출제</strong>
                <p>{CAREERS.examNote}</p>
              </li>
              <li>
                <strong>지원 방법</strong>
                <p>
                  채용시험문제 게시판에서 출제 범위를 확인하신 뒤, 아래 문의 양식에서 &lsquo;직원채용&rsquo;을
                  선택해 지원 의사를 보내주시면 절차를 개별 안내드립니다.
                </p>
              </li>
            </ul>
            <div className="co-exam-board">
              <div>
                <strong>임직원 채용시험문제 게시판</strong>
                <p>출제 범위는 실무 문제 게시판에서 확인하실 수 있습니다. 지원과 전형 절차는 문의 주시면 개별 안내드립니다.</p>
              </div>
              <span className="co-tag co-tag--soon">준비 중</span>
            </div>
          </div>
        </section>

        <QuestionsSection questions={questions} signedIn={signedIn} />

        <LibrarySection documents={documents} />

        {/* ── Q&A ──────────────────────────────────────────────────── */}
        <section className="co-section co-section--tint" id="faq">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">04 · Q&amp;A</p>
            <h2>자주 묻는 질문</h2>
            <p className="co-section-note">
              업무와 채용에 관한 질문을 계속 업데이트합니다. 게시는 관리자만 할 수 있습니다.
            </p>
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

        {/* ── 문의사항: 양식 + 대화창 ────────────────────────────────── */}
        <section className="co-section co-section--contact" id="contact">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">05 · CONTACT</p>
            <h2>문의사항</h2>
            <p className="co-section-note">
              M&amp;A 중개, 경영권 분쟁, 경영권 투자, M&amp;A 자금조달, 패밀리오피스, 투자가
              클럽에 관한 문의를 받고 있습니다. 검토 단계부터 비밀유지약정(NDA) 체결을
              원칙으로 합니다.
            </p>
          </div>

          <div className="co-contact co-reveal">
            <ContactForm />

            <div className="co-contact-side">
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
            <Link href="/privacy">개인정보처리방침</Link>
          </nav>
        </div>
        <div className="co-footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A. ALL RIGHTS RESERVED.</small>
          <div className="co-footer-end">
            <small>
              SITE BY <a href="https://tenai.kr" target="_blank" rel="noopener noreferrer">TEN AI</a>
            </small>
            {/* 회장 전용 출제 화면. 공개 페이지에서 눈에 띌 필요는 없지만,
                주소를 직접 입력하게 두지는 않는다. /admin은 자체 noindex. */}
            <Link className="footer-admin" href="/admin" rel="nofollow">
              출제자 입장 <i aria-hidden="true">→</i>
            </Link>
          </div>
        </div>
      </footer>

      <Reveal />
    </div>
  );
}
