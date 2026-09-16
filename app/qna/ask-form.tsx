"use client";

import { useState } from "react";
import Link from "next/link";
import { QNA_LIMITS } from "@/lib/qna";

/**
 * 질문하기.
 *
 * 보낸 질문이 곧바로 게시판에 서지 않는다는 것을 숨기지 않는다. 눌렀는데
 * 아무 데도 안 보이면 다시 누르고, 또 누른다 — 그래서 접수되었다는 말과
 * 언제 서는지를 그 자리에서 분명히 적는다.
 */
export default function AskForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [secret, setSecret] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: number; secret: boolean } | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    fetch("/api/qna", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, title, body, secret, agree }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as
          | { id?: number; secret?: boolean; error?: string }
          | null;
        if (!res.ok) {
          setError(data?.error ?? "접수하지 못했습니다. 잠시 후 다시 시도해 주십시오.");
          setBusy(false);
          return;
        }
        setDone({ id: data?.id ?? 0, secret: Boolean(data?.secret) });
        setBusy(false);
      })
      .catch(() => {
        setError("연결이 끊겼습니다. 잠시 후 다시 시도해 주십시오.");
        setBusy(false);
      });
  }

  if (done) {
    return (
      <div className="qa-done" role="status">
        <p className="qa-done-mark" aria-hidden="true">
          ✓
        </p>
        <h3>질문이 접수되었습니다</h3>
        <p className="qa-done-no">
          접수번호 <b>Q-{String(done.id).padStart(4, "0")}</b>
        </p>
        {done.secret ? (
          <p>
            비밀글로 보내셨습니다. 이 질문은 게시판에 오르지 않고 회장에게만 전달됩니다.
            답변은 적어 주신 이메일로 드립니다.
          </p>
        ) : (
          <p>
            답변이 준비되면 이 게시판에 질문과 함께 올라갑니다. 이메일을 적어 주셨다면
            따로 알려 드립니다.
          </p>
        )}
        <button type="button" className="co-btn co-btn--ghost co-btn--sm" onClick={() => setDone(null)}>
          질문 하나 더 남기기
        </button>
      </div>
    );
  }

  return (
    <form className="qa-form" onSubmit={submit}>
      <div className="qa-fields">
        <label className="qa-field">
          <span>
            이름 <i aria-hidden="true">*</i>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={QNA_LIMITS.name}
            required
            placeholder="게시판에 표시될 이름"
          />
        </label>
        <label className="qa-field">
          <span>이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={QNA_LIMITS.email}
            placeholder="선택 — 답변을 따로 받으실 주소"
          />
        </label>
      </div>
      <label className="qa-field">
        <span>
          제목 <i aria-hidden="true">*</i>
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={QNA_LIMITS.title}
          required
        />
      </label>
      <label className="qa-field">
        <span>
          질문 <i aria-hidden="true">*</i>
        </span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          maxLength={QNA_LIMITS.body}
          required
          placeholder="상황을 아시는 만큼 적어 주시면 더 정확히 답해 드릴 수 있습니다."
        />
      </label>

      <label className="qa-secret">
        <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
        <span>
          <b>비밀글로 보내기</b> — 게시판에 올리지 않고 회장에게만 전달합니다. 거래나 회사
          이름이 들어가는 질문은 이쪽을 권해 드립니다.
        </span>
      </label>

      <label className="qa-agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          답변을 위해 이름과 이메일, 질문 내용을 수집·이용하는 데 동의합니다. 자세한 내용은{" "}
          <Link href="/privacy">개인정보처리방침</Link>을 보십시오.
        </span>
      </label>

      {error && (
        <p className="qa-error" role="alert">
          {error}
        </p>
      )}

      <div className="qa-submit">
        <button type="submit" className="co-btn co-btn--primary" disabled={busy}>
          {busy ? "보내는 중…" : "질문 보내기"} <i aria-hidden="true">→</i>
        </button>
        <p>보내신 질문은 확인 후 게시판에 올라갑니다. 바로 보이지 않아도 접수된 것입니다.</p>
      </div>
    </form>
  );
}
