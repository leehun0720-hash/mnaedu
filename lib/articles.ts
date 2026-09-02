import "server-only";

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { articles } from "@/db/schema";
import { courseLabel, normalizeTrack } from "@/lib/questions";

/** 목록에 한 번에 세우는 최대 건수 — 연재 100여 회를 페이지로 나눈다 */
export const ARTICLES_PER_PAGE = 20;

/** 화면이 쓰는 칼럼 한 편 (목록용 — 본문 없음) */
export type ArticleSummary = {
  id: number;
  slug: string;
  title: string;
  lede: string;
  source: string | null;
  trackLabel: string | null;
  /** YYYY-MM-DD */
  date: string;
};

export type ArticleDetail = ArticleSummary & {
  /** 문단으로 끊어 둔 본문 — 화면은 그대로 <p>로 그리기만 한다 */
  paragraphs: string[];
};

/**
 * 제목에서 주소 이름을 만든다.
 *
 * 한글을 그대로 남긴다 — 브라우저가 알아서 인코딩하고, 검색에서는 로마자로
 * 옮긴 것보다 원문이 낫다. 저장할 때 한 번만 만들고 이후 제목을 고쳐도
 * 바꾸지 않는다(주소가 바뀌면 링크가 끊긴다).
 */
export function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    // 한글·영숫자·공백·하이픈만 남긴다
    .replace(/[^\p{Script=Hangul}\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
  return base || `column-${Date.now()}`;
}

/** 이미 쓰인 이름이면 뒤에 숫자를 붙인다 */
export async function uniqueSlug(title: string, exceptId?: number): Promise<string> {
  const base = slugify(title);
  const db = getDb();
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const clash = await db
      .select({ id: articles.id })
      .from(articles)
      .where(
        exceptId
          ? and(eq(articles.slug, candidate), ne(articles.id, exceptId))
          : eq(articles.slug, candidate)
      )
      .limit(1);
    if (clash.length === 0) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** 본문 앞부분으로 만드는 대체 요약 — 검색 결과에 빈 설명이 나가지 않게 */
function fallbackLede(body: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > 150 ? `${flat.slice(0, 150)}…` : flat;
}

function toSummary(row: {
  id: number;
  slug: string;
  title: string;
  lede: string | null;
  body?: string;
  source: string | null;
  track: string | null;
  publishedOn: Date | null;
  createdAt: Date;
}): ArticleSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    lede: row.lede?.trim() || (row.body ? fallbackLede(row.body) : ""),
    source: row.source,
    trackLabel: row.track ? courseLabel(normalizeTrack(row.track)) : null,
    date: (row.publishedOn ?? row.createdAt).toISOString().slice(0, 10),
  };
}

/** 목록에 필요한 열만 — 본문은 싣지 않는다 */
const LIST_COLUMNS = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  lede: articles.lede,
  source: articles.source,
  track: articles.track,
  publishedOn: articles.publishedOn,
  createdAt: articles.createdAt,
} as const;

/**
 * 발행된 칼럼 목록. 실패하면 빈 목록을 돌려준다 — 칼럼 때문에 홈페이지가
 * 멎는 것보다 칼럼이 비어 보이는 편이 낫다.
 */
export async function getPublishedArticles(
  limit = ARTICLES_PER_PAGE,
  offset = 0
): Promise<ArticleSummary[]> {
  if (!isDbConfigured()) return [];
  try {
    const rows = await getDb()
      .select(LIST_COLUMNS)
      .from(articles)
      .where(eq(articles.published, true))
      .orderBy(desc(articles.publishedOn), desc(articles.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(toSummary);
  } catch (err) {
    console.error("[articles] list failed:", err);
    return [];
  }
}

export async function countPublishedArticles(): Promise<number> {
  if (!isDbConfigured()) return 0;
  try {
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(articles)
      .where(eq(articles.published, true));
    return row?.n ?? 0;
  } catch (err) {
    console.error("[articles] count failed:", err);
    return 0;
  }
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  if (!isDbConfigured()) return null;
  try {
    const [row] = await getDb()
      .select()
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.published, true)))
      .limit(1);
    if (!row) return null;
    return {
      ...toSummary(row),
      // 빈 줄이 문단 구분이다. 태그는 해석하지 않으므로 화면에서 그대로 escape된다.
      paragraphs: row.body
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean),
    };
  } catch (err) {
    console.error("[articles] read failed:", err);
    return null;
  }
}

/** sitemap이 쓰는 최소 정보 */
export async function getArticleSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  if (!isDbConfigured()) return [];
  try {
    return await getDb()
      .select({ slug: articles.slug, updatedAt: articles.updatedAt })
      .from(articles)
      .where(eq(articles.published, true));
  } catch (err) {
    console.error("[articles] slug list failed:", err);
    return [];
  }
}
