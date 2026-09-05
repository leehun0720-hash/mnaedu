"use client";

import { useEffect } from "react";

/**
 * .co-reveal 요소를 뷰포트 진입 시 나타나게 하는 옵저버.
 *
 * 인라인 <script>가 아니라 클라이언트 컴포넌트여야 하는 이유: React는
 * 클라이언트 내비게이션으로 그린 DOM의 inline script를 실행하지 않으므로,
 * 게이트에서 Link로 들어온 방문자는 섹션이 opacity:0에 갇힌다. useEffect는
 * 첫 로드(하이드레이션)와 SPA 이동 양쪽에서 똑같이 실행된다.
 * JS가 아예 없는 환경은 CSS의 (scripting: enabled) 가드가 처리한다.
 */
export default function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".co-reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
