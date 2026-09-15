"use client";

import { useEffect, useRef } from "react";
import { plainToHtml, sanitizeHtml } from "@/lib/rich-text";

/**
 * 서식 편집기 — 구글 메일의 글쓰기 창과 같은 것.
 *
 * 회장 지시(2026-09-15). 굵게·기울임·밑줄·목록·소제목·인용·링크와 되돌리기.
 * 브라우저가 이미 갖고 있는 편집 기능(contentEditable + execCommand)을 쓴다.
 * 외부 편집기를 들이지 않는 이유는 둘이다 — 저장소가 공개되어 있어 의존성이
 * 곧 노출면이고, 필요한 것이 메일 글쓰기 수준이면 브라우저 것으로 충분하다.
 *
 * ── React 와의 약속 ──────────────────────────────────────────────
 * 편집 중인 내용은 DOM 이 쥔다. React 가 매 렌더마다 innerHTML 을 다시 쓰면
 * 커서와 서식이 날아간다(빌더에서 이미 겪었다). 그래서 초기 본문은 resetKey
 * 가 바뀔 때만 한 번 넣고, 그 뒤로는 DOM 이 바뀔 때 onChange 로 알리기만 한다.
 *
 * 붙여넣기는 서버와 같은 함수로 거른다. 워드가 보내는 <style> 덩어리와 span
 * 은 여기서 이미 떨어져 나가므로, 화면에서 보는 것과 저장되는 것이 같다.
 */
type Tool = { cmd: string; label: string; title: string; value?: string } | "|";

const TOOLS: Tool[] = [
  { cmd: "undo", label: "↶", title: "되돌리기" },
  { cmd: "redo", label: "↷", title: "다시 실행" },
  "|",
  { cmd: "bold", label: "B", title: "굵게" },
  { cmd: "italic", label: "I", title: "기울임" },
  { cmd: "underline", label: "U", title: "밑줄" },
  { cmd: "strikeThrough", label: "S", title: "취소선" },
  "|",
  { cmd: "formatBlock", value: "p", label: "본문", title: "본문 문단" },
  { cmd: "formatBlock", value: "h2", label: "제목", title: "소제목 (큰)" },
  { cmd: "formatBlock", value: "h3", label: "소제목", title: "소제목 (작은)" },
  { cmd: "formatBlock", value: "blockquote", label: "인용", title: "인용" },
  "|",
  { cmd: "insertUnorderedList", label: "• 목록", title: "글머리 목록" },
  { cmd: "insertOrderedList", label: "1. 목록", title: "번호 목록" },
  "|",
  { cmd: "createLink", label: "🔗 링크", title: "링크" },
  { cmd: "unlink", label: "링크 해제", title: "링크 해제" },
  { cmd: "removeFormat", label: "서식 지우기", title: "서식 지우기" },
];

export default function RichEditor({
  initialHtml,
  resetKey,
  onChange,
  placeholder,
  minRows = 12,
}: {
  /** 편집을 시작할 때의 본문 — resetKey 가 바뀔 때만 다시 읽는다 */
  initialHtml: string;
  /** 새 글로 돌리거나 다른 글을 불러올 때 바꾼다 */
  resetKey: number | string;
  onChange: (html: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Enter 가 <div> 대신 <p> 를 만들게 한다 — 저장되는 모양이 문단이어야 한다
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      /* 지원하지 않는 브라우저에서는 div 로 오고, 서버가 p 로 바꾼다 */
    }
    el.innerHTML = initialHtml;
  }, [initialHtml, resetKey]);

  function emit() {
    const el = ref.current;
    if (el) onChange(sanitizeHtml(el.innerHTML));
  }

  function run(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    emit();
  }

  function link() {
    const url = window.prompt("연결할 주소를 넣으십시오 (https://…)");
    if (!url) return;
    if (!/^https?:\/\//i.test(url.trim())) {
      window.alert("http:// 또는 https:// 로 시작하는 주소만 걸 수 있습니다.");
      return;
    }
    run("createLink", url.trim());
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const clean = html ? sanitizeHtml(html) : plainToHtml(text);
    document.execCommand("insertHTML", false, clean);
    emit();
  }

  return (
    <div className="rte">
      <div className="rte-bar" role="toolbar" aria-label="서식">
        {TOOLS.map((t, i) =>
          t === "|" ? (
            <span key={`sep-${i}`} className="rte-sep" />
          ) : (
            <button
              key={t.title}
              type="button"
              className="rte-btn"
              title={t.title}
              aria-label={t.title}
              // mousedown 을 막아야 편집 중인 선택 영역이 단추로 옮겨가지 않는다
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (t.cmd === "createLink" ? link() : run(t.cmd, t.value))}
            >
              {t.label}
            </button>
          )
        )}
      </div>
      <div
        ref={ref}
        className="rte-body"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder ?? ""}
        style={{ minHeight: `${minRows * 1.8}em` }}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
      />
    </div>
  );
}
