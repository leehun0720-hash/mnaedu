"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * .co-reveal 요소를 뷰포트 진입 시 나타나게 하는 옵저버.
 *
 * 이 부품은 뿌리 레이아웃(app/layout.tsx)에 한 번만 달린다. 그래야 한다 —
 * .co-reveal 은 CSS 에서 opacity:0 으로 시작하므로, 이 옵저버가 없는 화면의
 * 그 요소들은 영원히 투명한 채로 남는다. 글은 HTML 안에 멀쩡히 있는데
 * 화면에는 아무것도 없는, 가장 찾기 어려운 종류의 고장이 된다.
 *
 * 실제로 겪은 일이다(2026-09-16). 업무 화면의 업무자료·평가문제가 이 옵저버
 * 없이 .co-reveal 만 달고 있었다. 회장의 컴퓨터는 윈도우에서 동작 줄이기가
 * 켜져 있어 보였고(그 설정이 opacity 를 1로 되돌린다), 다른 분들의 화면에서는
 * 통째로 비어 보였다. 화면마다 따로 달지 않고 레이아웃 한 곳에 두는 이유다.
 *
 * 인라인 <script>가 아니라 클라이언트 컴포넌트여야 하는 이유: React는
 * 클라이언트 내비게이션으로 그린 DOM의 inline script를 실행하지 않으므로,
 * Link로 들어온 방문자는 섹션이 opacity:0에 갇힌다.
 *
 * pathname 을 의존성에 두는 이유: 뿌리 레이아웃은 화면을 옮겨도 다시 붙지
 * 않는다. 그래서 새 화면에 새로 그려진 .co-reveal 은 아무도 지켜보지 않게
 * 된다 — 주소가 바뀔 때마다 다시 훑어야 한다.
 *
 * JS가 아예 없는 환경은 CSS의 (scripting: enabled) 가드가 처리한다.
 */
export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".co-reveal:not(.is-in)");
    if (els.length === 0) return;

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
  }, [pathname]);

  return null;
}
