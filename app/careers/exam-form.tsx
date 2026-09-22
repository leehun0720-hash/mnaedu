"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLY_KINDS, LIMITS, type AnswerEntry } from "@/lib/recruit";
import type { ExamQuestion } from "@/lib/applications";

/**
 * 채용시험 응시 + 지원.
 *
 * 한 화면에서 끝난다 — 문제를 풀고, 그 아래에서 「직원채용」을 골라 지원 의사를
 * 보낸다. 시험장과 지원서를 따로 두면 문제만 보고 나가는 사람이 대부분이다.
 *
 * 채점 결과는 이 화면에 나오지 않는다. 주관식 답을 기계가 세는 것은 채점이
 * 아니라 흉내이기 때문이다. 회장이 읽고 매기신 뒤 개별로 알린다.
 */
export default function ExamForm({ questions }: { questions: ExamQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [kind, setKind] = useState<string>(APPLY_KINDS[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<number | null>(null);

  const written = questions.filter((q) => (answers[q.id] ?? "").trim().length > 0).length;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const filled: AnswerEntry[] = questions
      .filter((q) => (answers[q.id] ?? "").trim().length > 0)
      .map((q) => ({ questionId: q.id, prompt: q.prompt, answer: (answers[q.id] ?? "").trim() }));

    if (filled.length === 0) {
      setError("답안을 한 문항 이상 작성해 주십시오.");
      return;
    }

    setBusy(true);
    fetch("/api/careers/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, phone, kind, note, agree, answers: filled }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { id?: number; error?: string } | null;
        if (!res.ok) {
          setError(data?.error ?? "접수하지 못했습니다. 잠시 후 다시 시도해 주십시오.");
          setBusy(false);
          return;
        }
        setDone(data?.id ?? 0);
        setBusy(false);
      })
      .catch(() => {
        setError("연결이 끊겼습니다. 잠시 후 다시 시도해 주십시오.");
        setBusy(false);
      });
  }

  if (done !== null) {
    return (
      <div className="rc-done" role="status">
        <p className="rc-done-mark" aria-hidden="true">
          ✓
        </p>
        <h2>지원이 접수되었습니다</h2>
        <p className="rc-done-no">
          접수번호 <b>{done ? `A-${String(done).padStart(4, "0")}` : "확인 중"}</b>
        </p>
        <p>
          보내 주신 답안을 회장이 직접 읽고 검토합니다. 전형 절차는 적어 주신 이메일로 개별
          안내드립니다.
        </p>
        <p className="rc-done-note">
          이 화면을 닫으셔도 접수는 그대로 남습니다. 수정이 필요하시면 문의로 알려 주십시오.
        </p>
        <Link className="co-btn co-btn--ghost co-btn--sm" href="/">
          <i aria-hidden="true">←</i> 홈페이지 첫 화면으로
        </Link>
      </div>
    );
  }

  return (
    <form className="rc-form" onSubmit={submit}>
      <section className="rc-block">
        <h2>
          1. 시험 답안 <small>{questions.length}문항</small>
        </h2>
        {questions.length === 0 ? (
          <p className="rc-empty">
            출제된 채용시험 문제가 아직 없습니다. 준비되는 대로 이 자리에 올라갑니다. 먼저 지원
            의사만 보내시려면 아래 문의 양식을 이용해 주십시오.
          </p>
        ) : (
          <>
            <p className="rc-block-note">
              분량 제한은 없습니다. 아는 만큼 적어 주시고, 모르는 문항은 비워 두셔도 접수됩니다.
              작성하신 <b>{written}</b>문항이 함께 제출됩니다.
            </p>
            <ol className="rc-questions">
              {questions.map((q) => (
                <li key={q.id}>
                  <p className="rc-q-no">문제 {q.no}</p>
                  {/* 저장할 때 거른 글이다 — 그대로 그린다 */}
                  <div
                    className="rc-q-prompt"
                    dangerouslySetInnerHTML={{ __html: q.promptHtml }}
                  />
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    rows={6}
                    maxLength={LIMITS.answer}
                    placeholder="답안을 작성해 주십시오."
                    aria-label={`문제 ${q.no} 답안`}
                  />
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <section className="rc-block">
        <h2>2. 지원 의사</h2>
        <div className="rc-fields">
          <label className="rc-field">
            <span>지원 구분</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {APPLY_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="rc-field">
            <span>
              성함 <i aria-hidden="true">*</i>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={LIMITS.name}
              required
              autoComplete="name"
            />
          </label>
          <label className="rc-field">
            <span>
              이메일 <i aria-hidden="true">*</i>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={LIMITS.email}
              required
              autoComplete="email"
              placeholder="회신받으실 주소"
            />
          </label>
          <label className="rc-field">
            <span>연락처</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={LIMITS.phone}
              autoComplete="tel"
              placeholder="선택"
            />
          </label>
        </div>
        <label className="rc-field rc-field--wide">
          <span>지원 동기 · 경력 요약</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            maxLength={LIMITS.note}
            placeholder="선택 — 어떤 일을 해 오셨고 무엇을 하고 싶으신지 적어 주십시오."
          />
        </label>
        <label className="rc-agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            채용 전형 진행을 위해 성함·이메일·연락처와 제출하신 답안을 수집·이용하는 데
            동의합니다. 전형이 끝나면 파기합니다. 자세한 내용은{" "}
            <Link href="/privacy">개인정보처리방침</Link>을 보십시오.
          </span>
        </label>
      </section>

      {error && (
        <p className="rc-error" role="alert">
          {error}
        </p>
      )}

      <div className="rc-submit">
        <button type="submit" className="co-btn co-btn--primary" disabled={busy}>
          {busy ? "보내는 중…" : "지원 의사 보내기"} <i aria-hidden="true">→</i>
        </button>
        <p>보내고 나면 수정이 어렵습니다. 한 번 더 읽어 보신 뒤 눌러 주십시오.</p>
      </div>
    </form>
  );
}
