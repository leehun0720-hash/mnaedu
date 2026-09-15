import type { Metadata } from "next";
import { headers } from "next/headers";
import { Noto_Sans_KR, Inter } from "next/font/google";
import { BRAND } from "@/lib/builder/brand";
import "./globals.css";

/**
 * 한글 본문은 Noto Sans KR, 영문·숫자는 Inter. 텐에이아이 톤(미니멀·신뢰감)에
 * 맞추어 고딕 한 벌로 간다 — 도구 화면은 조용할수록 좋다.
 */
const sans = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const label = Inter({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

/**
 * 주소는 코드에 박지 않고 요청에서 읽는다. 어느 도메인에 올리든 canonical 과
 * OG 주소가 그 도메인으로 따라간다.
 */
export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title: `${BRAND.product} | ${BRAND.productEn}`,
    description:
      "구역을 쌓아 홈페이지를 만들고 HTML 한 장으로 내보내는 제작 도구. 텐에이아이가 중소기업·공공기관 고객에게 제공합니다.",
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${sans.variable} ${label.variable}`}>{children}</body>
    </html>
  );
}
