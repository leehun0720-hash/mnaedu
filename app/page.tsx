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
import UpdatesSection from "./updates-section";
import { getPublicQuestions } from "@/lib/questions-db";
import { getPublicDocuments } from "@/lib/documents";
import AdminLink from "./admin-link";
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
  { href: "#updates", label: "새 소식" },
  { href: "#careers", label: "직원채용" },
  { href: "/qna", label: "Q&A" },
  { href: "#contact", label: "문의사항" },
] as const;

export const dynamic = "force-dynamic";

/** 첫 화면 기사·칼럼 게시판에 세우는 글 수 (회장 지시: 20개) */
const HOME_BOARD_SIZE = 20;

export default async function HomePage() {
  const [questions, documents, member, latestArticles, articleCount] = await Promise.all([
    getPublicQuestions(5),
    getPublicDocuments(5),
    getCurrentMember(),
    getPublishedArticles(HOME_BOARD_SIZE),
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
          <AdminLink variant="nav" />
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
          </div>

          {/* 기사·칼럼 게시판 — 회장 지시(2026-09-15): 전체를 게시판으로, 20개, 새 글은 NEW. */}
          <div className="co-board-wrap co-reveal">
            <div className="co-board-head">
              <strong>기사 · 칼럼</strong>
              <span className="co-board-count">
                {articleCount > 0 ? `전체 ${articleCount}편` : "준비 중"}
              </span>
              {articleCount > HOME_BOARD_SIZE && (
                <Link className="co-board-more" href="/insights">
                  전체 보기 <i aria-hidden="true">→</i>
                </Link>
              )}
            </div>
            {latestArticles.length > 0 ? (
              <ol className="co-board" aria-label="기사·칼럼 목록">
                {latestArticles.map((a, i) => (
                  <li key={a.id} className="co-board-row">
                    <span className="co-board-no" aria-hidden="true">
                      {String(articleCount - i).padStart(2, "0")}
                    </span>
                    <Link className="co-board-title" href={`/insights/${encodeURIComponent(a.slug)}`}>
                      {a.title}
                      {a.isNew && <em className="co-new">NEW</em>}
                    </Link>
                    <time className="co-board-date" dateTime={a.date}>
                      {a.date}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="co-board-empty">회사와 업무에 관한 기사와 칼럼을 이곳에 모으고 있습니다.</p>
            )}
          </div>

          <div className="co-principles co-reveal">
            <h3>
              ㈜프론티어 M&amp;A의 5대 운영원칙{" "}
              <span>다섯 가지 원칙을 바탕으로 모든 업무를 진행합니다</span>
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
              다룹니다. 각 분야의 업무자료와 평가문제는 해당 업무 화면에 올려 둡니다.
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

          {/* 회장 지시 16 — 주요업무 화면에 세우는 강의 프로그램 안내 */}
          <aside className="co-program co-reveal">
            <p className="co-program-eyebrow">TOP TIER PROGRAM</p>
            <p>
              ㈜프론티어 M&amp;A에서는 패밀리오피스 운영전문가와 투자가클럽 운영전문가에 대한 Top
              Tier급 전문가를 양성하는 강의 프로그램을 운영하고 있습니다. 단, ㈜프론티어 M&amp;A의
              홈페이지에서 제공하는 주요업무자료와 평가문제를 통하여, 일정 수준 이상의 기초실력을
              갖춘 분에 한하여 수강이 가능합니다.
            </p>
            <p>
              또한 수강인원은 5명~10명 정도로 실무에서 부딪치게 되는 난해한 문제 또는 딜레마를
              해결할 수 있는 내용을 위주로 진행됩니다. 때문에 일정 수준 이상의 실력과 경험이 없는
              분은 본 강의를 수강할 수 없습니다.
            </p>
          </aside>
        </section>

        <UpdatesSection documents={documents} questions={questions} />

        {/* ── 직원채용 ─────────────────────────────────────────────── */}
        <section className="co-section" id="careers">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">04 · CAREERS</p>
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
                  채용시험 화면에서 문제를 푸신 뒤, 같은 자리에서 &lsquo;직원채용&rsquo;을 선택해 지원
                  의사를 보내주시면 절차를 개별 안내드립니다.
                </p>
              </li>
            </ul>
            <div className="co-exam-board">
              <div>
                <strong>임직원 채용시험</strong>
                <p>문제를 푸시고 그 자리에서 지원하실 수 있습니다. 답안은 회장이 직접 읽고 판단합니다.</p>
              </div>
              <Link className="co-btn co-btn--primary co-btn--sm" href="/careers">
                채용시험 응시하기 <i aria-hidden="true">→</i>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Q&A ──────────────────────────────────────────────────── */}
        <section className="co-section co-section--tint" id="faq">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">05 · Q&amp;A</p>
            <h2>자주 묻는 질문</h2>
            <p className="co-section-note">
              여기에 없는 것은 직접 물어보실 수 있습니다. 답변은 회장이 직접 드립니다.
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
          <div className="co-exam-board co-reveal">
            <div>
              <strong>묻고 답하기 게시판</strong>
              <p>업무·절차·채용에 관해 직접 질문하시면 답변을 이 게시판에 올려 드립니다.</p>
            </div>
            <Link className="co-btn co-btn--primary co-btn--sm" href="/qna#ask">
              질문 남기기 <i aria-hidden="true">→</i>
            </Link>
          </div>
        </section>

        {/* ── 문의사항: 양식 + 대화창 ────────────────────────────────── */}
        <section className="co-section co-section--contact" id="contact">
          <div className="co-section-head co-reveal">
            <p className="co-section-index">06 · CONTACT</p>
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
                  <div>
                    <dt>홈페이지</dt>
                    <dd>{CONTACT.site}</dd>
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
            <AdminLink variant="footer" />
          </div>
        </div>
      </footer>

    </div>
  );
}
