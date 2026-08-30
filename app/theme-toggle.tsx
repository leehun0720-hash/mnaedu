"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * 테마 선택 (사용자 취향).
 *
 * 색만 바꾼다 — data-theme를 <html>에 붙이면 globals.css의 토큰 오버라이드가
 * 전 화면에 적용된다. 선택은 브라우저에 저장(localStorage)해 다음 방문에도
 * 유지하고, 첫 페인트 전 인라인 스크립트(layout.tsx)가 같은 값을 미리 붙여
 * 화면이 깜빡이지 않게 한다.
 *
 * 관리자 화면(/admin)에는 붙이지 않는다 — 출제 작업용 화면이라 장식이
 * 끼어들 자리가 아니다.
 */
export const THEMES = [
  { id: "", name: "엠버", swatch: "#D8341A" },
  { id: "navy", name: "감청", swatch: "#22406B" },
  { id: "sepia", name: "세피아", swatch: "#7A5B2E" },
] as const;

const STORAGE_KEY = "fma-theme";

// 현재 테마는 <html>의 속성이 원본이다. React 상태로 복제하지 않고
// useSyncExternalStore로 그 값을 그대로 읽는다 — 서버는 빈 값(기본 엠버),
// 클라이언트는 인라인 스크립트가 이미 붙여 둔 실제 값을 본다.
let listeners: (() => void)[] = [];
function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
function currentTheme(): string {
  return document.documentElement.getAttribute("data-theme") ?? "";
}
function serverTheme(): string {
  return "";
}

function setTheme(id: string) {
  const root = document.documentElement;
  if (id) root.setAttribute("data-theme", id);
  else root.removeAttribute("data-theme");
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 저장 못 해도 이번 세션 동안은 적용된다 */
  }
  listeners.forEach((l) => l());
}

export default function ThemeToggle() {
  const current = useSyncExternalStore(subscribe, currentTheme, serverTheme);
  const [open, setOpen] = useState(false);

  return (
    <div className={`theme-toggle ${open ? "is-open" : ""}`}>
      <div className="theme-toggle-options" role="group" aria-label="화면 색 테마">
        {THEMES.map((t) => (
          <button
            key={t.id || "ember"}
            type="button"
            className={`theme-swatch ${current === t.id ? "is-current" : ""}`}
            style={{ background: t.swatch }}
            onClick={() => {
              setTheme(t.id);
              setOpen(false);
            }}
            aria-pressed={current === t.id}
            aria-label={`${t.name} 테마`}
            title={`${t.name} 테마`}
          >
            {current === t.id && <span aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="theme-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="화면 색 테마 선택"
        title="화면 색 테마"
      >
        <span aria-hidden="true">◑</span>
      </button>
    </div>
  );
}
