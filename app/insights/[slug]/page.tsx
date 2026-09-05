import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug, getPublishedArticles } from "@/lib/articles";
import { CONTACT } from "@/lib/company";
import CopyGuard from "../../copy-guard";
import ThemeToggle from "../../theme-toggle";
import SiteRail from "../../site-rail";
import { getCurrentMember } from "@/lib/members";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(decodeURIComponent(slug));
  if (!article) return { title: "기사 · 칼럼 | ㈜프론티어 M&A" };

  return {
    title: `${article.title} | ㈜프론티어 M&A`,
    description: article.lede,
    // 검색 결과에 원문 게재일이 뜨도록 글 유형으로 알린다
    openGraph: {
      type: "article",
      title: article.title,
      description: article.lede,
      publishedTime: article.date,
    },
    alternates: { canonical: `/insights/${encodeURIComponent(article.slug)}` },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(decodeURIComponent(slug));
  if (!article) notFound();

  const [more, member] = await Promise.all([getPublishedArticles(4), getCurrentMember()]);
  const others = more.filter((a) => a.id !== article.id).slice(0, 3);

  // 검색엔진이 글·저자·게재일을 알아보게 하는 구조화 데이터.
  // 값은 전부 우리가 만든 것이라 사용자 입력이 그대로 들어가지 않는다.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.lede,
    datePublished: article.date,
    author: { "@type": "Person", name: "성보경" },
    publisher: { "@type": "Organization", name: "㈜프론티어 M&A" },
    ...(article.source ? { isBasedOn: article.source } : {}),
  };

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
            <Link href="/insights">기사 · 칼럼</Link>
          </nav>

          <header className="ins-head">
            <div className="ins-meta">
              {article.source && <span className="ins-source">{article.source}</span>}
              {article.trackLabel && <span className="ins-track">{article.trackLabel}</span>}
              <time className="ins-date" dateTime={article.date}>
                {article.date}
              </time>
            </div>
            <h1>{article.title}</h1>
            {article.lede && <p className="ins-article-lede">{article.lede}</p>}
          </header>

          <div className="ins-body">
            {article.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <footer className="ins-foot">
            <p className="ins-byline">
              글 · 성보경 ㈜프론티어 M&amp;A 회장
              {article.source && <> · {article.source} 게재</>}
            </p>
            <div className="ins-cta">
              <p>다루신 사안이 있으시면 먼저 상황부터 들려주십시오.</p>
              <a className="co-btn co-btn--primary" href={`mailto:${CONTACT.email}`}>
                상담 신청하기 <i aria-hidden="true">→</i>
              </a>
            </div>
          </footer>
        </article>

        {others.length > 0 && (
          <section className="co-section co-section--tint">
            <div className="co-section-head">
              <h2>다른 글</h2>
            </div>
            <ol className="ins-list">
              {others.map((a) => (
                <li key={a.id} className="ins-item">
                  <Link href={`/insights/${encodeURIComponent(a.slug)}`}>
                    <div className="ins-meta">
                      {a.source && <span className="ins-source">{a.source}</span>}
                      <time className="ins-date" dateTime={a.date}>
                        {a.date}
                      </time>
                    </div>
                    <strong className="ins-title">{a.title}</strong>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>

      <footer className="co-footer">
        <div className="co-footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A. ALL RIGHTS RESERVED.</small>
          <Link href="/insights">목록으로</Link>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
