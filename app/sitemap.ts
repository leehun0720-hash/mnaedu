import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { BUSINESS_AREAS } from "@/lib/company";
import { getArticleSlugs } from "@/lib/articles";

export const dynamic = "force-dynamic";

/**
 * 칼럼을 웹 글로 옮긴 이유가 검색 노출이므로, 목록을 검색엔진에 직접 알린다.
 * 도메인이 아직 확정 전이라 요청 헤더에서 주소를 읽는다 — vercel.app이든
 * 자체 도메인이든 그때 쓰는 주소로 나간다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${protocol}://${host}`;

  const articles = await getArticleSlugs();

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/insights`, changeFrequency: "weekly", priority: 0.8 },
    ...BUSINESS_AREAS.map((b) => ({
      url: `${base}/business/${b.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...articles.map((a) => ({
      url: `${base}/insights/${encodeURIComponent(a.slug)}`,
      lastModified: a.updatedAt,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
