import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CONTACT, businessArea } from "@/lib/company";
import { getDocumentForReading } from "@/lib/documents";
import { getCurrentMember } from "@/lib/members";
import CopyGuard from "../../copy-guard";
import ThemeToggle from "../../theme-toggle";
import SiteRail from "../../site-rail";

type Params = { id: string };

export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const numeric = parseId(id);
  const doc = numeric ? await getDocumentForReading(numeric) : null;
  if (!doc) return { title: "업무자료 | ㈜프론티어 M&A" };
  return {
    title: `${doc.title} | ㈜프론티어 M&A`,
    description: doc.summary ?? doc.excerpt,
  };
}

/**
 * 붙여넣은 글로 올린 자료를 읽는 자리.
 *
 * 회장 지시(2026-09-15): 자료실도 파일이 아니라 칼럼처럼 본문을 붙여넣는다.
 * 그 글이 서는 곳이 여기다. 칼럼(/insights)과 모양을 맞추되, 돌아가는 길은
 * 검색용 칼럼 목록이 아니라 그 자료가 속한 분야 화면이다.
 */
export default async function LibraryDocumentPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const numeric = parseId(id);
  if (!numeric) notFound();

  const [doc, member] = await Promise.all([getDocumentForReading(numeric), getCurrentMember()]);
  if (!doc) notFound();

  const area = doc.track ? businessArea(doc.track) : undefined;
  const backHref = area ? `/business/${area.slug}#library` : "/";

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
        <div className="co-header-actions">
          <Link className="co-cta-link" href="/#contact">
            상담신청 <i aria-hidden="true">→</i>
          </Link>
        </div>
      </header>

      <main>
        <article className="co-section ins-article">
          <nav className="ins-crumb" aria-label="위치">
            <Link href="/">홈페이지 첫 화면</Link>
            {area && (
              <>
                <span aria-hidden="true"> · </span>
                <Link href={backHref}>{area.name} 업무자료</Link>
              </>
            )}
          </nav>

          <header className="ins-head">
            <div className="ins-meta">
              <span className="ins-source">{doc.kind}</span>
              {doc.trackLabel && <span className="ins-track">{doc.trackLabel}</span>}
              <time className="ins-date" dateTime={doc.date}>
                {doc.date}
              </time>
            </div>
            <h1>{doc.title}</h1>
            {doc.summary && <p className="ins-article-lede">{doc.summary}</p>}
          </header>

          {/* 저장할 때 lib/rich-text 로 걸렀고 읽을 때 한 번 더 걸렀다 — 그래서 그대로 그린다 */}
          <div className="ins-body" dangerouslySetInnerHTML={{ __html: doc.html }} />

          <footer className="ins-foot">
            <p className="ins-back">
              <Link className="co-btn co-btn--ghost co-btn--sm" href={backHref}>
                <i aria-hidden="true">←</i> {area ? `${area.name} 업무자료로` : "홈페이지 첫 화면으로"}
              </Link>
            </p>
            <p className="ins-byline">자료 · 성보경 ㈜프론티어 M&amp;A 회장</p>
            <div className="ins-cta">
              <p>다루신 사안이 있으시면 먼저 상황부터 들려주십시오.</p>
              <Link className="co-btn co-btn--primary" href="/#contact">
                전문가 상담하기 <i aria-hidden="true">→</i>
              </Link>
              <p className="ins-cta-line">
                전화도 좋습니다 — <a href={CONTACT.telHref}>{CONTACT.tel}</a>
              </p>
            </div>
          </footer>
        </article>
      </main>

      <footer className="co-footer">
        <div className="co-footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A. ALL RIGHTS RESERVED.</small>
          <small>
            <Link href="/">홈</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/privacy">개인정보처리방침</Link>
          </small>
        </div>
      </footer>
    </div>
  );
}
