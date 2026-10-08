"use client";

import { useState } from "react";
import { BUSINESS_AREAS, CONTACT } from "@/lib/company";

/**
 * 상담 신청 양식.
 *
 * 회장 지적(2026-10-08): 문제를 읽다가 상담 신청을 했더니 화면이 첫 화면으로
 * 빠져나가고, 보낸 상담 내용을 확인할 수 없었다.
 *
 * 전에는 메일 프로그램을 여는 것으로 끝났다. 이제는 그 자리에서 서버로 보내고,
 * 화면은 움직이지 않는다 — 보낸 내용과 접수 번호를 양식 자리에 그대로 보여
 * 주고, 읽던 문제는 위아래에 그대로 남는다. 신청은 관리자 화면 「상담 신청」
 * 탭에 쌓인다.
 *
 * 주요업무 화면에서는 그 분야가 미리 골라져 있다(defaultArea).
 */
const EXTRA_AREAS = [
  // 경영권 투자는 별도 메뉴가 없지만 문안·문의 항목으로는 유지한다 (보고서 9장-3 기본안)
  { value: "경영권 투자", label: "경영권 투자" },
  { value: "직원채용", label: "직원채용" },
  { value: "기타", label: "기타 문의" },
];

type Sent = { id: number; area: string; name: string; org: string; phone: string; email: string; message: string };

export default function ContactForm({
  defaultArea,
  source,
}: {
  /** 미리 골라 둘 문의 분야 — 주요업무 화면에서 그 분야 이름 */
  defaultArea?: string;
  /** 보낸 화면 경로 — 관리자 화면에서 어디서 온 신청인지 보이게 */
  source?: string;
}) {
  const [area, setArea] = useState(defaultArea ?? BUSINESS_AREAS[0].name);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 서버가 받지 못할 때(데이터베이스가 없을 때)만 메일로 보낼 길을 연다 */
  const [offline, setOffline] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          area,
          name,
          org,
          phone,
          email,
          message,
          agree,
          source: source ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: number; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "접수하지 못했습니다. 잠시 후 다시 시도해 주십시오.");
        setOffline(res.status === 503);
        return;
      }
      setSent({ id: data.id, area, name, org, phone, email, message });
    } catch {
      setError("서버에 닿지 않았습니다. 잠시 후 다시 시도해 주십시오.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSent(null);
    setMessage("");
    setAgree(false);
  };

  if (sent) {
    return (
      <div className="co-form co-form-done" role="status">
        <p className="co-form-done-no">접수번호 {sent.id}</p>
        <h3>상담 신청이 접수되었습니다</h3>
        <p className="co-form-done-lede">
          확인 후 적어 주신 연락처로 개별 연락드립니다. 아래가 보내신 내용입니다 — 이 화면은
          그대로이니 읽던 문제를 계속 보셔도 됩니다.
        </p>
        <dl className="co-form-done-list">
          <dt>문의 분야</dt>
          <dd>{sent.area}</dd>
          <dt>성함</dt>
          <dd>
            {sent.name}
            {sent.org ? ` · ${sent.org}` : ""}
          </dd>
          <dt>연락처</dt>
          <dd>
            {sent.phone ? `${sent.phone} · ` : ""}
            {sent.email}
          </dd>
          <dt>문의 내용</dt>
          <dd className="co-form-done-message">{sent.message}</dd>
        </dl>
        <button type="button" className="co-btn co-btn--ghost co-btn--sm" onClick={reset}>
          다른 문의 보내기
        </button>
      </div>
    );
  }

  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    `[문의] ${area} — ${name || "성함 미기재"}`
  )}&body=${encodeURIComponent(
    [`문의 분야: ${area}`, `성함: ${name}`, `소속/직함: ${org}`, `연락처: ${phone}`, `이메일: ${email}`, "", message].join("\n")
  )}`;

  return (
    <form className="co-form" onSubmit={submit}>
      <div className="co-form-row">
        <label htmlFor="cf-area">문의 분야</label>
        <select id="cf-area" value={area} onChange={(e) => setArea(e.target.value)}>
          {BUSINESS_AREAS.map((b) => (
            <option key={b.slug} value={b.name}>
              {b.name}
            </option>
          ))}
          {EXTRA_AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="co-form-grid">
        <div className="co-form-row">
          <label htmlFor="cf-name">성함</label>
          <input id="cf-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="co-form-row">
          <label htmlFor="cf-org">소속 · 직함</label>
          <input id="cf-org" value={org} onChange={(e) => setOrg(e.target.value)} />
        </div>
        <div className="co-form-row">
          <label htmlFor="cf-phone">연락처</label>
          <input id="cf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="co-form-row">
          <label htmlFor="cf-email">이메일</label>
          <input
            id="cf-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="co-form-row">
        <label htmlFor="cf-message">문의 내용</label>
        <textarea
          id="cf-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <label className="co-form-agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required />
        <span>
          상담 회신을 위해 성함·연락처·이메일·문의 내용을 수집·이용하는 데 동의합니다. 보내주신
          내용은 비밀유지 원칙에 따라 관리합니다. <a href="/privacy">개인정보처리방침</a>
        </span>
      </label>

      <button type="submit" className="co-btn co-btn--primary" disabled={busy}>
        {busy ? "보내는 중…" : "상담 신청하기"} <i aria-hidden="true">→</i>
      </button>
      {error && (
        <p className="co-form-error" role="alert">
          {error}
          {offline && (
            <>
              {" "}
              <a href={mailto}>메일로 보내기</a> · <a href={CONTACT.telHref}>{CONTACT.tel}</a>
            </>
          )}
        </p>
      )}
    </form>
  );
}
