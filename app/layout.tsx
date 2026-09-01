import type { Metadata } from "next";
import { headers } from "next/headers";
import { Noto_Sans_KR, Noto_Serif_KR, Inter } from "next/font/google";
import "./globals.css";

// Typeface roles follow the BI/CI guidelines: Korean body/UI → Pretendard ·
// Noto Sans KR, English & numerals → Inter, headline voice → Noto Serif KR.
const sans = Noto_Sans_KR({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const serif = Noto_Serif_KR({ variable: "--font-serif", subsets: ["latin"], weight: ["500", "600", "700"] });
const label = Inter({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  const title = "프론티어 M&A | 경영권 분쟁 · M&A 자문";
  const description =
    "우호적 M&A, 적대적 M&A와 경영권 분쟁, 경영권 투자를 수행합니다. 경영권 분쟁 27건 수행, 26승 1무.";

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/logo-frontier-group.svg", type: "image/svg+xml" },
      ],
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ko_KR",
      images: [{ url: `${baseUrl}/og.png`, width: 1680, height: 945 }],
    },
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
