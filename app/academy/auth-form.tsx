"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser, isAuthConfigured } from "@/lib/supabase/client";

/**
 * 가입·로그인 화면 (기획 보고서 4.3 — 가입 창구는 아카데미 하나뿐).
 *
 * 신원 확인은 Supabase Auth가 맡는다. 이메일 인증과 비밀번호 재설정을
 * 직접 안전하게 만들면 품이 많이 드는데, 그쪽이 검증된 구현을 준다.
 * 수집 항목은 이메일·비밀번호·성함까지로 최소화한다 (보고서 8장).
 */
export default function AuthForm({ mode }: { mode: "join" | "login" }) {
  const isJoin = mode === "join";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const configured = isAuthConfigured();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setBusy(true);
    setError("");

    if (isJoin) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setBusy(false);
      if (error) return setError(translate(error.message));
      setSent(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(translate(error.message));
    // 서버 컴포넌트가 새 세션을 읽도록 전체 이동으로 넘긴다
    window.location.href = "/academy/me";
  }

  if (!configured) {
    return (
      <div className="auth-card">
        <h1>{isJoin ? "회원가입" : "로그인"}</h1>
        <p className="auth-note">
          회원 시스템 준비가 끝나면 이 자리에서 바로 가입하실 수 있습니다. 그동안 문의는
          아래 연락처로 부탁드립니다.
        </p>
        <Link className="button button-red" href="/academy">
          아카데미로 돌아가기 <span>→</span>
        </Link>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="auth-card">
        <h1>메일을 확인해 주십시오</h1>
        <p className="auth-note">
          <strong>{email}</strong> 으로 인증 링크를 보냈습니다. 링크를 누르시면 가입이
          완료되고 L1 입문 퀴즈가 열립니다.
        </p>
        <Link className="button button-red" href="/academy/login">
          로그인 화면으로 <span>→</span>
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>{isJoin ? "회원가입" : "로그인"}</h1>
      <p className="auth-note">
        {isJoin
          ? "가입하시면 L1 입문 퀴즈를 무료로 푸실 수 있습니다. 풀며 쌓은 포인트로 회장 해설을 엽니다."
          : "가입하신 이메일과 비밀번호로 들어오십시오."}
      </p>

      {isJoin && (
        <label className="auth-field">
          <span>성함</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </label>
      )}

      <label className="auth-field">
        <span>이메일</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className="auth-field">
        <span>비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isJoin ? "new-password" : "current-password"}
          minLength={8}
          required
        />
        {isJoin && <i className="auth-hint">8자 이상</i>}
      </label>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="button button-red" disabled={busy}>
        {busy ? "처리 중…" : isJoin ? "가입하기" : "로그인"} <span>→</span>
      </button>

      <p className="auth-switch">
        {isJoin ? (
          <>
            이미 회원이십니까? <Link href="/academy/login">로그인</Link>
          </>
        ) : (
          <>
            아직 회원이 아니십니까? <Link href="/academy/join">회원가입</Link>
          </>
        )}
      </p>

      <p className="auth-legal">
        가입하시면 <Link href="/privacy">개인정보처리방침</Link>에 동의하신 것으로 봅니다.
      </p>
    </form>
  );
}

/** Supabase가 주는 영문 메시지를 회원이 읽을 수 있는 말로 옮긴다 */
function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (m.includes("email not confirmed")) return "메일로 보낸 인증 링크를 먼저 눌러 주십시오.";
  if (m.includes("already registered")) return "이미 가입된 이메일입니다. 로그인해 주십시오.";
  if (m.includes("password")) return "비밀번호는 8자 이상이어야 합니다.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "요청이 잦습니다. 잠시 후 다시 시도해 주십시오.";
  return "처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주십시오.";
}
