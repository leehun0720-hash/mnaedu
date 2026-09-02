import type { Metadata } from "next";
import { headers } from "next/headers";
import { Noto_Sans_KR, Noto_Serif_KR, Inter, Big_Shoulders } from "next/font/google";
import "./globals.css";

// Typeface roles follow both BI/CI guidelines:
// Korean body/UI → Pretendard · Noto Sans KR, English & numerals → Inter.
const sans = Noto_Sans_KR({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const serif = Noto_Serif_KR({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "600", "700", "900"] });
const label = Inter({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
// Oversized condensed display face for the giant section markers.
const display = Big_Shoulders({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${protocol}://${host}`;
  const title = "㈜프론티어 M&A | FRONTIER M&A";
  const description = "1993년 국내 최초로 설립된 M&A 전문회사 — M&A 중개, 경영권 분쟁, 경영권 투자, M&A 자금조달 자문.";

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/logo-frontier-group.svg", type: "image/svg+xml" },
      ],
    },
    // title/description을 여기 넣으면 하위 페이지의 og:title 폴백이 막힌다 —
    // 이미지·카드 타입만 두고 제목·설명은 각 페이지 metadata에서 온다.
    openGraph: { images: [{ url: `${baseUrl}/og.png`, width: 1680, height: 945 }] },
    twitter: { card: "summary_large_image", images: [`${baseUrl}/og.png`] },
  };
}

// Runs before the body paints, so a returning visitor never sees the opening
// curtain flash up and disappear. React then unmounts it on the same tick.
// Also applies the saved colour theme in the same breath, so a chosen theme
// never flashes the default palette first.
const BOOT = `try{if(sessionStorage.getItem('fma-intro-seen')==='1'){document.documentElement.classList.add('intro-seen')}}catch(e){}
try{var t=localStorage.getItem('fma-theme');if(t){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${sans.variable} ${serif.variable} ${label.variable} ${display.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        {children}
      </body>
    </html>
  );
}
