"use client";

import { useEffect, useRef } from "react";

/**
 * 열람자 워터마크 (기획 보고서 8장).
 *
 * 복사·우클릭·인쇄는 막을 수 있지만 화면 캡처는 어떤 웹 기술로도 막지
 * 못한다. 그래서 회장 해설처럼 유출되면 곤란한 자산 위에는 '누가 언제
 * 열었는지'를 옅게 깔아 둔다 — 캡처를 막는 장치가 아니라, 캡처가 돌아다닐
 * 때 출처가 드러나게 하는 장치다. 억제력은 여기서 나온다.
 *
 * 클릭을 가로채지 않으므로(pointer-events: none) 아래 내용은 그대로 쓴다.
 * DOM을 손대면 지울 수 있지만, 그건 캡처를 막을 수 없다는 사실과 같은
 * 한계이지 이 장치의 결함이 아니다.
 */
export default function Watermark({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // 열람 시각은 브라우저 시계라 서버가 알 수 없다. 상태로 두면 서버와
  // 클라이언트가 다른 화면을 그려 하이드레이션이 어긋나므로, 마운트 뒤에
  // 배경만 직접 갈아 끼운다 — 다시 그릴 것도 없다.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;
    el.style.backgroundImage = tile(`${label} · ${stamp}`);
  }, [label]);

  return (
    <div ref={ref} className="watermark" aria-hidden="true" style={{ backgroundImage: tile(label) }} />
  );
}

/**
 * 기울인 글자를 타일로 반복한다. SVG를 배경으로 쓰면 글자가 선택되지도,
 * 복사되지도 않는다 — 텍스트 노드로 깔면 본문과 함께 긁혀 나간다.
 */
function tile(text: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="180">
    <text x="0" y="120" transform="rotate(-24 0 120)"
      font-family="system-ui, sans-serif" font-size="15" fill="rgba(255,255,255,0.13)">
      ${escapeXml(text)}
    </text>
  </svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/** SVG 안에 그대로 들어가므로 이메일의 &, < 같은 글자를 반드시 막는다 */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
