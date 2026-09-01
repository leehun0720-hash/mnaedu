"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "signup" | "login";

/**
 * Registration and sign-in in one dialog. It exists for one reason — to open
 * the answers — so the copy stays on that point and never mentions payment.
 */
export default function MemberGate({
  open,
  mode: initialMode,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onSignedIn: (name: string) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // No effect syncs `mode` back to the prop: the parent remounts this
  // component with a fresh key each time it opens, so the initial state is
  // always the mode it was opened with, and switching tabs stays local.

  // Escape closes, and the page behind must not scroll while this is up
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus lands on the first field so a keyboard user is already inside
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload =
      mode === "signup"
        ? {
            name: String(form.get("name") ?? ""),
            company: String(form.get("company") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          }
        : {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          };

    try {
      const res = await fetch(`/api/member/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; name?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "처리 중 문제가 발생했습니다.");
        return;
      }
      onSignedIn(data.name ?? "회원");
    } catch {
      setError("연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="gate-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="gate-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
        ref={dialogRef}
      >
        <button className="gate-close" onClick={onClose} aria-label="닫기">
          ✕
        </button>

        <p className="gate-eyebrow">MEMBER ACCESS</p>
        <h2 id="gate-title" className="gate-title">
          {mode === "signup" ? "정답과 해설을 여시려면" : "회원 로그인"}
        </h2>
        <p className="gate-lead">
          {mode === "signup"
            ? "등록에 별도 비용은 없습니다. 문제의 정답과 논거 해설 전문이 바로 열립니다."
            : "가입하신 이메일로 로그인하시면 해설이 다시 열립니다."}
        </p>

        <form className="gate-form" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label className="gate-field">
                <span>이름</span>
                <input ref={firstFieldRef} name="name" required maxLength={60} autoComplete="name" />
              </label>
              <label className="gate-field">
                <span>
                  회사 · 소속 <em>(선택)</em>
                </span>
                <input name="company" maxLength={120} autoComplete="organization" />
              </label>
            </>
          )}

          <label className="gate-field">
            <span>이메일</span>
            <input
              ref={mode === "login" ? firstFieldRef : undefined}
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>

          <label className="gate-field">
            <span>비밀번호{mode === "signup" && <em> (8자 이상)</em>}</span>
            <input
              name="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </label>

          {error && (
            <p className="gate-error" role="alert">
              {error}
            </p>
          )}

          <button className="gate-submit" type="submit" disabled={busy}>
            {busy ? "처리 중…" : mode === "signup" ? "등록하고 해설 보기" : "로그인"}
          </button>
        </form>

        <p className="gate-switch">
          {mode === "signup" ? (
            <>
              이미 등록하셨습니까?{" "}
              <button type="button" onClick={() => setMode("login")}>
                로그인
              </button>
            </>
          ) : (
            <>
              아직 등록 전이십니까?{" "}
              <button type="button" onClick={() => setMode("signup")}>
                회원 등록
              </button>
            </>
          )}
        </p>

        <p className="gate-note">
          남겨주신 정보는 해설 열람과 새 문제 안내에만 사용합니다. 제3자에게 제공하지 않습니다.
        </p>
      </div>
    </div>
  );
}
