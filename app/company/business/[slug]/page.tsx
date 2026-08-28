import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BUSINESS_AREAS,
  CONTACT,
  OFFLINE_ONLY_NOTICE,
  TENURE_NOTE,
  businessArea,
} from "@/lib/company";
import CopyGuard from "../../../copy-guard";
import SiteRail from "../../../site-rail";

type Params = { slug: string };

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

export default async function BusinessDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const area = businessArea(slug);
  if (!area) notFound();

  // 원고에 "40년"이 나오는 분야에는 각주를 붙인다 — 소개문에만 나오는 분야도
  // 있으므로 둘 다 본다 (보고서 9장-8 기본안: 회사 연혁과 개인 경력 구분 표기)
  const needsTenureNote = [area.intro, ...area.curriculumIntro].some((t) => t.includes("40년"));

  return (
    <div className="co-page">
      <CopyGuard />
      <SiteRail site="company" />

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
          <a href="/company#about">회사소개</a>
          <a href="/company#business">주요업무</a>
          <a href="/company#careers">직원채용</a>
          <a href="/company#faq">Q&amp;A</a>
          <a href="/company#contact">문의사항</a>
        </nav>
        <div className="co-header-actions">
          <a className="co-academy-link" href="#contact">
            상담신청 <i aria-hidden="true">→</i>
          </a>
        </div>
      </header>

      <main>
        <section className="co-detail-hero">
          <a className="co-backlink" href="/company#business">
            <i aria-hidden="true">←</i> 주요 업무
          </a>
          <p className="co-detail-en">{area.en}</p>
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
                <Link className="co-tag co-tag--quiz" href="/academy#exam">
                  평가시험 ↗
                </Link>
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
                  <Link className="co-tag co-tag--quiz" href="/academy#exam">
                    평가시험 ↗
                  </Link>
                </span>
              </li>
            ))}
          </ol>

          {/* 정답·해설은 공개 데이터에서 원천 배제하고, 열람은 아카데미 회원의
              포인트 차감 화면에 한정한다 (보고서 4.3 · 8장). */}
          <p className="co-topic-note">
            업무자료는 공개를 원칙으로 합니다. 평가시험은 M&amp;A 아카데미에서 진행되며, 정답과
            회장 해설은 공개 영역에 노출되지 않고 회원 화면에서만 열람하실 수 있습니다.
          </p>
        </section>

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
              <a className="co-btn co-btn--primary" href="/company#contact">
                상담 신청하기 <i aria-hidden="true">→</i>
              </a>
            </div>
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
            <Link href="/privacy">개인정보처리방침</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/">메인</Link>
          </small>
        </div>
      </footer>
    </div>
  );
}
