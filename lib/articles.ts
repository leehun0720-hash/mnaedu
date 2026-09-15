import "server-only";

import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { articles } from "@/db/schema";
import {
  courseLabel,
  normalizeStage,
  normalizeTrack,
  trackAliases,
  type Stage,
} from "@/lib/questions";
import { bodyToHtml, htmlToText } from "@/lib/rich-text";

/** 목록에 한 번에 세우는 최대 건수 — 연재 100여 회를 페이지로 나눈다 */
/** 한 면에 10개씩 노출 (회장 지시 2026-09) */
export const ARTICLES_PER_PAGE = 10;

/** 화면이 쓰는 칼럼 한 편 (목록용 — 본문 없음) */
export type ArticleSummary = {
  id: number;
  slug: string;
  title: string;
  lede: string;
  source: string | null;
  /** 분야 슬러그 — 그 분야 자료실에 함께 세울 때 쓴다 */
  track: string | null;
  trackLabel: string | null;
  /** 기초 | 심화 — 나누지 않은 글에는 없다 */
  stage: Stage | null;
  /** YYYY-MM-DD */
  date: string;
};

export type ArticleDetail = ArticleSummary & {
  /**
   * 그릴 준비가 된 본문 HTML — 저장할 때 걸렀고, 여기서 한 번 더 거른다.
   * 옛 글(평문)은 문단으로 감싸 준다.
   */
  html: string;
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
  // 서식 있는 글이면 태그를 벗기고 앞부분만 쓴다
  const flat = htmlToText(bodyToHtml(body)).replace(/\s+/g, " ").trim();
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
  stage: string | null;
  publishedOn: Date | null;
  createdAt: Date;
}): ArticleSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    lede: row.lede?.trim() || (row.body ? fallbackLede(row.body) : ""),
    source: row.source,
    track: row.track ? normalizeTrack(row.track) : null,
    trackLabel: row.track ? courseLabel(normalizeTrack(row.track)) : null,
    stage: normalizeStage(row.stage),
    // 회장 지시(2026-09-15): 게재처·게재일은 두지 않는다. 남는 것은 작성한 날뿐이다.
    date: row.createdAt.toISOString().slice(0, 10),
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
  stage: articles.stage,
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
      .orderBy(desc(articles.createdAt))
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
      html: bodyToHtml(row.body),
    };
  } catch (err) {
    console.error("[articles] read failed:", err);
    return null;
  }
}

/**
 * 한 분야의 글 — 그 분야 자료실에 자료와 나란히 선다.
 *
 * 회장 지시(2026-09-15): "각 클럽 자료실에 글을 업로드할 수 있게." 자료실은
 * 내려받는 파일만 받았고, 글은 칼럼으로만 올라가 /insights 에만 섰다. 그래서
 * 패밀리오피스에 올리려던 글이 그 분야 화면 어디에도 보이지 않았다.
 *
 * 표를 새로 만들지 않는다. 칼럼은 이미 분야를 달고 있으니, 분야를 정해 올리신
 * 글을 그 분야 자료실에서도 함께 읽어 오면 된다 — 한 번 쓰신 글이 두 곳에 선다.
 */
export async function getArticlesByTrack(
  slug: string,
  limit = 20,
  stage: Stage | null = null
): Promise<ArticleSummary[]> {
  if (!isDbConfigured()) return [];
  try {
    const where = [eq(articles.published, true), inArray(articles.track, trackAliases(slug))];
    if (stage) where.push(eq(articles.stage, stage));
    const rows = await getDb()
      .select(LIST_COLUMNS)
      .from(articles)
      .where(and(...where))
      .orderBy(desc(articles.createdAt))
      .limit(limit);
    return rows.map(toSummary);
  } catch (err) {
    console.error("[articles] track list failed:", err);
    return [];
  }
}

export async function countArticlesByTrack(
  slug: string,
  stage: Stage | null = null
): Promise<number> {
  if (!isDbConfigured()) return 0;
  try {
    const where = [eq(articles.published, true), inArray(articles.track, trackAliases(slug))];
    if (stage) where.push(eq(articles.stage, stage));
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(articles)
      .where(and(...where));
    return row?.n ?? 0;
  } catch (err) {
    console.error("[articles] track count failed:", err);
    return 0;
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
