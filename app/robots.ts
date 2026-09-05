import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * 회원·관리자 화면은 색인에서 빼고 나머지는 연다. 각 페이지도 자체 noindex를
 * 걸고 있으므로 이 파일은 크롤러가 애초에 들르지 않게 하는 1차 안내다.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/join", "/login", "/auth/"],
    },
    sitemap: `${protocol}://${host}/sitemap.xml`,
  };
}
