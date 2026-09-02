"use client";

import { useState } from "react";
import { BUSINESS_AREAS, CONTACT } from "@/lib/company";

/**
 * 문의 양식 (설계서: "문의하기에 대한 양식을 작성할 것 / 제출하면 바로 메일로
 * 전달되도록 할 것").
 *
 * 서버 발송은 수신 메일 계정이 확정된 뒤 연결한다 (보고서 9장-15 —
 * 기본안: 도메인 메일 수신 + 개인 메일 자동 전달). 그때까지는 작성 내용을
 * 그대로 메일 초안으로 넘겨, 문의가 유실되지 않게 한다.
 */
export default function ContactForm() {
  const [area, setArea] = useState(BUSINESS_AREAS[0].name);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `[문의] ${area} — ${name || "성함 미기재"}`;
    const body = [
      `문의 분야: ${area}`,
      `성함: ${name}`,
      `소속/직함: ${org}`,
      `연락처: ${phone}`,
      `이메일: ${email}`,
      "",
      message,
    ].join("\n");
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

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
          {/* 경영권 투자는 별도 메뉴가 없지만 문안·문의 항목으로는 유지한다
              (보고서 9장-3 기본안) */}
          <option value="경영권 투자">경영권 투자</option>
          <option value="채용">직원채용</option>
          <option value="기타">기타 문의</option>
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

      <p className="co-form-note">
        보내주신 내용은 비밀유지 원칙에 따라 관리되며, 접수 후 개별적으로 연락드립니다.{" "}
        <a href="/privacy">개인정보처리방침</a>
      </p>
      <button type="submit" className="co-btn co-btn--primary">
        문의 보내기 <i aria-hidden="true">→</i>
      </button>
      {sent && (
        <p className="co-form-sent" role="status">
          메일 프로그램으로 문의 내용을 넘겼습니다. 창이 열리지 않으면{" "}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>로 보내주십시오.
        </p>
      )}
    </form>
  );
}
