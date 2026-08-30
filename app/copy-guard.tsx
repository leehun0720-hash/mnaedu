"use client";

import { useEffect } from "react";

/**
 * 복사 방지 (설계서 지시: "전체에 복사 방지 기능을 첨가할 것").
 *
 * 우클릭 · 드래그 선택 · 복사/잘라내기 · 저장/인쇄 단축키를 억제한다.
 * 입력 요소는 예외로 두어야 문의 양식과 검색이 정상 동작하고, 관리자
 * 화면(/admin)에는 이 컴포넌트를 붙이지 않아 출제 작업이 막히지 않는다.
 *
 * 한계는 보고서 8장에 고지한 그대로다 — 화면 캡처는 어떤 웹 기술로도 막지
 * 못한다. 그래서 핵심 자산(회장 해설)은 회원 전용 열람으로 가두고, 그 위에
 * 열람자 워터마크(app/watermark.tsx)를 깔아 유출 시 출처가 드러나게 한다.
 */
const isEditable = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  return !!el?.closest?.("input, textarea, select, [contenteditable='true']");
};

export default function CopyGuard() {
  useEffect(() => {
    const block = (e: Event) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      // 복사·잘라내기·전체선택과 저장·인쇄·소스 보기
      if (mod && !e.shiftKey && ["c", "x", "a", "s", "p", "u"].includes(key)) {
        e.preventDefault();
        return;
      }
      // 개발자 도구 — 우회 가능하지만 즉흥적인 시도는 여기서 걸린다.
      // 이것으로 자산이 지켜진다고 보지는 않는다(보고서 8장).
      if (e.key === "F12" || (mod && e.shiftKey && ["i", "j", "c"].includes(key))) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("keydown", onKeyDown);
    document.documentElement.classList.add("copy-guarded");

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("copy-guarded");
    };
  }, []);

  return null;
}
