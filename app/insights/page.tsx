import Link from "next/link";
import type { Metadata } from "next";
import { ARTICLES_PER_PAGE, countPublishedArticles, getPublishedArticles } from "@/lib/articles";
import CopyGuard from "../copy-guard";
import ThemeToggle from "../theme-toggle";
import SiteRail from "../site-rail";
import { getCurrentMember } from "@/lib/members";

export const metadata: Metadata = {
  title: "기사 · 칼럼 | ㈜프론티어 M&A",
  description:
    "성보경 회장이 아주경제 등에 연재한 M&A 칼럼 아카이브. 경영권 분쟁, M&A 중개, 자금조달 현장에서 나온 글을 모았습니다.",
};

export const dynamic = "force-dynamic";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const offset = (current - 1) * ARTICLES_PER_PAGE;

  const [items, total, member] = await Promise.all([
    getPublishedArticles(ARTICLES_PER_PAGE, offset),
    countPublishedArticles(),
    getCurrentMember(),
  ]);
  const lastPage = Math.max(1, Math.ceil(total / ARTICLES_PER_PAGE));

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
        <section className="co-section">
          <div className="co-section-head">
            <p className="co-section-index">INSIGHTS</p>
            <h2>기사 · 칼럼</h2>
            <p className="co-section-note">
              성보경 회장이 아주경제 등에 연재한 글을 옮겨 싣습니다. 현장에서 판단이 갈렸던
              지점을 그대로 다룹니다.
              {total > 0 && <> 현재 {total}편.</>}
            </p>
          </div>

          {items.length === 0 ? (
            <div className="co-empty">
              <strong>칼럼을 옮기고 있습니다</strong>
              <p>게재가 시작되면 이 자리에 최신 글이 올라옵니다.</p>
            </div>
          ) : (
            <>
              <ol className="ins-list">
                {items.map((a) => (
                  <li key={a.id} className="ins-item">
                    <Link href={`/insights/${encodeURIComponent(a.slug)}`}>
                      <div className="ins-meta">
                        {a.source && <span className="ins-source">{a.source}</span>}
                        {a.trackLabel && <span className="ins-track">{a.trackLabel}</span>}
                        <time className="ins-date" dateTime={a.date}>
                          {a.date}
                        </time>
                      </div>
                      <strong className="ins-title">{a.title}</strong>
                      {a.lede && <p className="ins-lede">{a.lede}</p>}
                      <span className="ins-more">
                        읽기 <i aria-hidden="true">→</i>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              {lastPage > 1 && (
                <nav className="ins-pager" aria-label="칼럼 목록 페이지">
                  {current > 1 && (
                    <Link className="co-btn co-btn--ghost" href={`/insights?page=${current - 1}`}>
                      <i aria-hidden="true">←</i> 이전
                    </Link>
                  )}
                  <span className="ins-pager-now">
                    {current} / {lastPage}
                  </span>
                  {current < lastPage && (
                    <Link className="co-btn co-btn--ghost" href={`/insights?page=${current + 1}`}>
                      다음 <i aria-hidden="true">→</i>
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="co-footer">
        <div className="co-footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A. ALL RIGHTS RESERVED.</small>
          <Link href="/">홈으로</Link>
        </div>
      </footer>
    </div>
  );
}
