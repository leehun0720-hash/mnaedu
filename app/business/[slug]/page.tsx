import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BUSINESS_AREAS,
  CONTACT,
  OFFLINE_LIBRARY_NOTICE,
  OFFLINE_MEMBERSHIP_NOTICE,
  OFFLINE_ONLY_NOTICE,
  OPEN_POLICY_NOTICE,
  TENURE_NOTE,
  businessArea,
  officeOf,
} from "@/lib/company";
import CopyGuard from "../../copy-guard";
import ThemeToggle from "../../theme-toggle";
import SiteRail from "../../site-rail";
import QuestionsSection from "../../questions-section";
import LibrarySection from "../../library-section";
import BoardPager, { BOARD_PAGE_SIZE } from "../../board-pager";
import { getCurrentMember } from "@/lib/members";
import { countQuestionsByTrack, getQuestionsByTrack } from "@/lib/questions-db";
import { countDocumentsByTrack, getDocumentsByTrack } from "@/lib/documents";

type Params = { slug: string };
/** 자료·문제 게시판이 붙으므로 요청 시점에 그린다 */
export const dynamic = "force-dynamic";

// 5분야 모두 페이지를 갖는다. 패밀리오피스·투자가 클럽은 기초 소개와 목차,
// 상담 접점까지만 두고 세부는 오프라인으로 넘긴다 (보고서 3.5절).
export function generateStaticParams(): Params[] {
  return BUSINESS_AREAS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const area = businessArea(slug);
  if (!area) return { title: "㈜프론티어 M&A | 기업 홈페이지" };
  return {
    title: `${area.name} | ㈜프론티어 M&A`,
    description: area.line,
  };
}

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ dp?: string; qp?: string }>;
}) {
  const { slug } = await params;
  const area = businessArea(slug);
  if (!area) notFound();

  // 게시판 두 개가 한 화면에 있으므로 쪽 번호도 따로 받는다
  const { dp, qp } = await searchParams;
  const docPage = Math.max(1, Number(dp) || 1);
  const quizPage = Math.max(1, Number(qp) || 1);
  const [documents, documentCount, questions, questionCount, member] = await Promise.all([
    getDocumentsByTrack(area.slug, BOARD_PAGE_SIZE, (docPage - 1) * BOARD_PAGE_SIZE),
    countDocumentsByTrack(area.slug),
    getQuestionsByTrack(area.slug, BOARD_PAGE_SIZE, (quizPage - 1) * BOARD_PAGE_SIZE),
    countQuestionsByTrack(area.slug),
    getCurrentMember(),
  ]);

  // 원고에 "40년"이 나오는 분야에는 각주를 붙인다 — 소개문에만 나오는 분야도
  // 있으므로 둘 다 본다 (보고서 9장-8 기본안: 회사 연혁과 개인 경력 구분 표기)
  const needsTenureNote = [area.intro, ...area.curriculumIntro].some((t) => t.includes("40년"));

  return (
    <div className="co-page">
      <CopyGuard />
      <ThemeToggle />
      <SiteRail signedIn={member !== null} />

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
          <Link href="/#about">회사소개</Link>
          <Link href="/#business">주요업무</Link>
          <Link href="/#careers">직원채용</Link>
          <Link href="/#faq">Q&amp;A</Link>
          <Link href="/#contact">문의사항</Link>
        </nav>
        <div className="co-header-actions">
          <a className="co-cta-link" href="#contact">
            상담신청 <i aria-hidden="true">→</i>
          </a>
        </div>
      </header>

      <main>
        <section className="co-detail-hero">
          <Link className="co-backlink" href="/#business">
            <i aria-hidden="true">←</i> 주요 업무
          </Link>
          <p className="co-detail-en">
            <span className="co-office-badge" data-office={area.office}>{officeOf(area).name}</span>
            {area.en}
          </p>
          <h1>{area.name}</h1>
          <p className="co-detail-lede">{area.intro}</p>
          <div className="co-hero-actions">
            <a className="co-btn co-btn--primary" href="#contact">
              상담 신청하기 <i aria-hidden="true">→</i>
            </a>
          </div>
        </section>

        {area.offlineOnly && (
          <aside className="co-offline-note" role="note">
            <strong>웹 안내 범위</strong>
            <p>{OFFLINE_ONLY_NOTICE}</p>
            {OFFLINE_MEMBERSHIP_NOTICE[area.slug] && (
              <p className="co-offline-join">{OFFLINE_MEMBERSHIP_NOTICE[area.slug]}</p>
            )}
          </aside>
        )}

        <section className="co-section co-section--tint">
          <div className="co-section-head">
            <p className="co-section-index">CURRICULUM</p>
            <h2>업무 커리큘럼</h2>
            {area.curriculumIntro.map((t) => (
              <p key={t.slice(0, 24)} className="co-section-note co-section-note--wide">
                {t}
              </p>
            ))}
            {needsTenureNote && <p className="co-footnote">※ {TENURE_NOTE}</p>}
          </div>

          {area.masterTip && (
            <div className="co-mastertip">
              <span className="co-mastertip-badge">MASTER TIP</span>
              <span className="co-mastertip-title">{area.masterTip}</span>
              <span className="co-topic-tags">
                <i className="co-tag co-tag--soon">업무자료 준비 중</i>
                {/* 시크릿 오피스에는 평가문제 칸이 없다 — 없는 곳으로 가는 표를 걸지 않는다 */}
                {!area.offlineOnly && (
                  <Link className="co-tag co-tag--quiz" href="#questions">
                    평가문제 ↓
                  </Link>
                )}
              </span>
            </div>
          )}

          <ol className="co-topic-list">
            {area.curriculum.map((topic, i) => (
              <li key={topic.label} className="co-topic">
                <span className="co-topic-no" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="co-topic-title">{topic.label}</span>
                <span className="co-topic-tags">
                  <i className="co-tag co-tag--soon">업무자료 준비 중</i>
                  {!area.offlineOnly && (
                    <Link className="co-tag co-tag--quiz" href="#questions">
                      평가문제 ↓
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ol>

          {/* 정답·해설은 공개 데이터에서 원천 배제하고, 열람은 실무 문제 회원의
              포인트 차감 화면에 한정한다 (보고서 4.3 · 8장). */}
          <p className="co-topic-note">{OPEN_POLICY_NOTICE}</p>
        </section>

        {/* 회장 지시 1 — 업무자료와 평가문제는 각 주요업무 화면에 둔다.
            시크릿 오피스(패밀리오피스·투자가 클럽)에서 닫는 것은 평가문제뿐이다.
            그 두 분야는 오프라인으로만 교육하므로 문제은행에 오르지 않는다.
            반면 업무자료는 회원을 모으는 소개 자료이므로 그대로 세운다. */}
        <LibrarySection
          documents={documents}
          index="LIBRARY"
          title={`${area.name} 업무자료`}
          note={area.offlineOnly ? OFFLINE_LIBRARY_NOTICE : OPEN_POLICY_NOTICE}
          pager={
            <BoardPager
              page={docPage}
              total={documentCount}
              param="dp"
              basePath={`/business/${area.slug}`}
              hash="library"
            />
          }
        />

        {!area.offlineOnly && (
          <QuestionsSection
            questions={questions}
            signedIn={member !== null}
            index="PRACTICE"
            title={`${area.name} 평가문제`}
            note="문제 본문은 누구나 보실 수 있습니다. 정답과 해설은 회원등록 후에 열람하실 수 있습니다."
            pager={
              <BoardPager
                page={quizPage}
                total={questionCount}
                param="qp"
                basePath={`/business/${area.slug}`}
                hash="questions"
              />
            }
          />
        )}

        <section className="co-section co-section--contact" id="contact">
          <div className="co-contact co-contact--slim">
            <div className="co-contact-copy">
              <h2>이 업무를 의뢰하시겠습니까?</h2>
              <p>
                검토 단계부터 비밀유지약정(NDA) 체결을 원칙으로 합니다. 아래 문의처로 연락을
                주시면 개별 상담 일정을 안내드립니다.
              </p>
              <p className="co-contact-line">
                <a href={CONTACT.telHref}>{CONTACT.tel}</a>
                <span aria-hidden="true"> · </span>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </p>
              <Link className="co-btn co-btn--primary" href="/#contact">
                상담 신청하기 <i aria-hidden="true">→</i>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="co-footer">
        <div className="co-footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A. ALL RIGHTS RESERVED.</small>
          <small>
            <Link href="/">홈</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/">퀴즈 실무 문제</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/privacy">개인정보처리방침</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/">메인</Link>
          </small>
        </div>
      </footer>
    </div>
  );
}
