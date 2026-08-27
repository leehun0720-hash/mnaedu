import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BUSINESS_AREAS, CONTACT, businessArea } from "@/lib/company";

type Params = { slug: string };

// 공개 업무 3개만 상세 페이지를 갖는다. 패밀리오피스·투자가클럽은
// 목록에 명칭 한 줄만 두는 웹 부재 원칙이라 여기 오지 않는다(404).
export function generateStaticParams(): Params[] {
  return BUSINESS_AREAS.filter((b) => b.open).map((b) => ({ slug: b.slug }));
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
          <a href="/company#about">회사소개</a>
          <a href="/company#business">주요업무</a>
          <a href="/company#faq">Q&amp;A</a>
          <a href="/company#contact">문의</a>
        </nav>
        <div className="co-header-actions">
          <Link className="co-academy-link" href="/academy">
            아카데미 <i aria-hidden="true">↗</i>
          </Link>
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
            <a className="co-btn co-btn--primary" href={`mailto:${CONTACT.email}`}>
              상담 신청하기 <i aria-hidden="true">→</i>
            </a>
          </div>
        </section>

        <section className="co-section co-section--tint">
          <div className="co-section-head">
            <p className="co-section-index">CURRICULUM</p>
            <h2>업무 커리큘럼</h2>
            {area.curriculumIntro?.map((t) => (
              <p key={t.slice(0, 24)} className="co-section-note co-section-note--wide">
                {t}
              </p>
            ))}
          </div>

          <ol className="co-topic-list">
            {area.curriculum?.map((topic, i) => (
              <li key={topic} className="co-topic">
                <span className="co-topic-no" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="co-topic-title">{topic}</span>
                <span className="co-topic-tags">
                  <i className="co-tag co-tag--soon">업무자료 준비 중</i>
                  <Link className="co-tag co-tag--quiz" href="/academy#exam">
                    평가시험문제 ↗
                  </Link>
                </span>
              </li>
            ))}
          </ol>

          {/* 정답·출제 의도는 공개 데이터에서 원천 배제(불변 원칙) — 회원에게도 약속하지 않는다 */}
          <p className="co-topic-note">
            업무자료는 공개를 원칙으로 합니다. 평가시험은 M&amp;A 아카데미에서 진행되며,
            정답과 출제 의도는 공개되지 않습니다.
          </p>
        </section>

        <section className="co-section co-section--contact">
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
              <a className="co-btn co-btn--primary" href={`mailto:${CONTACT.email}`}>
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
            <Link href="/">메인 게이트</Link>
          </small>
        </div>
      </footer>
    </div>
  );
}
