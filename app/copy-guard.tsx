"use client";

import { useEffect } from "react";

/**
 * 복사 방지 (설계서 지시: "전체에 복사 방지 기능을 첨가할 것").
 *
 * 우클릭 · 드래그 선택 · 복사/잘라내기 · 저장/인쇄 단축키를 억제한다.
 * 입력 요소는 예외로 두어야 문의 양식과 검색이 정상 동작하고, 관리자
 * 화면(/admin)에는 이 컴포넌트를 붙이지 않아 출제 작업이 막히지 않는다.
 *
 * 한계는 보고서 8장에 고지한 그대로다 — 화면 캡처까지 막는 완전 차단은
 * 불가능하므로 핵심 자산은 회원 전용 열람·워터마크로 보완한다.
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
      // 저장·인쇄·소스 보기와 복사/잘라내기
      if (mod && ["c", "x", "s", "p", "u"].includes(e.key.toLowerCase())) {
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
