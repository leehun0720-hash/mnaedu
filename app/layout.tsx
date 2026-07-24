import type { Metadata } from "next";
import { headers } from "next/headers";
import { Noto_Sans_KR, Noto_Serif_KR, Inter } from "next/font/google";
import "./globals.css";

// Typeface roles follow both BI/CI guidelines:
// Korean body/UI → Pretendard · Noto Sans KR, English & numerals → Inter.
const sans = Noto_Sans_KR({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const serif = Noto_Serif_KR({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "600", "700", "900"] });
const label = Inter({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  const title = "M&A Mastery | FRONTIER M&A × TEN AI";
  const description = "M&A·경영권 투자·패밀리 오피스 전문가를 위한 프리미엄 온라인 아카데미";

  return {
    title,
    description,
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/logo-frontier-symbol.png", type: "image/png" },
      ],
    },
    openGraph: { title, description, images: [{ url: `${baseUrl}/og.png`, width: 1680, height: 945 }] },
    twitter: { card: "summary_large_image", title, description, images: [`${baseUrl}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${sans.variable} ${serif.variable} ${label.variable}`}>{children}</body>
    </html>
  );
}
