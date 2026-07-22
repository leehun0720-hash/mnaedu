import type { Metadata } from "next";
import { headers } from "next/headers";
import { Noto_Sans_KR, Cormorant_Garamond, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_KR({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const serif = Cormorant_Garamond({ variable: "--font-serif", subsets: ["latin"], weight: ["500", "600", "700"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

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
    icons: { icon: "/logo-frontier-symbol.png" },
    openGraph: { title, description, images: [{ url: `${baseUrl}/og.png`, width: 1680, height: 945 }] },
    twitter: { card: "summary_large_image", title, description, images: [`${baseUrl}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
