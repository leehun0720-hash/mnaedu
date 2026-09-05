"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicQuestion } from "@/lib/questions";

type Revealed = { answer: string; explanation: string };

/**
 * 실무 문제.
 *
 * 문제 본문은 누구나 읽는다 — 잘 만든 문제를 보고 "이 사람에게 맡겨야겠다"에
 * 이르게 하는 것이 이 섹션의 유일한 역할이다. 정답과 해설만 로그인 뒤로
 * 둔다. 채점도, 등급도, 점수도 없다.
 */
export default function QuestionsSection({
  questions,
  signedIn,
}: {
  questions: PublicQuestion[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState<Record<number, Revealed>>({});
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});

  async function reveal(id: number) {
    if (open[id] || pending !== null) return;
    setPending(id);
    setError(null);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id }),
      });
      const data = (await res.json()) as {
        answer?: string;
        explanation?: string;
        error?: string;
        needsMember?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? "정답을 불러오지 못했습니다.");
        return;
      }
      setOpen((prev) => ({
        ...prev,
        [id]: { answer: data.answer ?? "", explanation: data.explanation ?? "" },
      }));
    } catch {
      setError("연결에 실패했습니다. 잠시 후 다시 시도해 주십시오.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="co-section" id="questions">
      <div className="co-section-head co-reveal">
        <p className="co-section-index">05 · PRACTICE</p>
        <h2>실무 문제</h2>
        <p className="co-section-note">
          실제 거래에서 판단이 갈렸던 지점을 문제로 옮겼습니다. 문제는 누구나 보실 수 있고,
          정답과 해설은 회원으로 등록하시면 열립니다.
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="co-empty co-reveal">
          <strong>문제를 준비하고 있습니다</strong>
          <p>게재가 시작되면 이 자리에 최신 문제가 올라옵니다.</p>
        </div>
      ) : (
        <ol className="qa-list co-reveal">
          {questions.map((q) => {
            const shown = q.id != null ? open[q.id] : undefined;
            const busy = q.id != null && pending === q.id;
            return (
              <li key={`${q.no}-${q.prompt.slice(0, 12)}`} className="qa-item" data-open={Boolean(shown)}>
                <div className="qa-meta">
                  <span className="qa-no">{String(q.no).padStart(2, "0")}</span>
                  <span className="qa-track">{q.trackLabel}</span>
                  <span className="qa-type">{q.type}</span>
                </div>

                <p className="qa-prompt">{q.prompt}</p>

                {q.choices && q.choices.length > 0 && (
                  <ul className="qa-choices">
                    {q.choices.map((choice, index) => (
                      <li key={choice}>
                        <button
                          type="button"
                          className="qa-choice"
                          data-picked={q.id != null && picked[q.id] === index}
                          onClick={() =>
                            q.id != null && setPicked((prev) => ({ ...prev, [q.id!]: index }))
                          }
                        >
                          <span className="qa-choice-mark">{"①②③④⑤"[index] ?? index + 1}</span>
                          <span>{choice}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {shown ? (
                  <div className="qa-answer">
                    {shown.answer && (
                      <>
                        <h3>정답</h3>
                        <p>{shown.answer}</p>
                      </>
                    )}
                    {shown.explanation && (
                      <>
                        <h3>해설</h3>
                        <p>{shown.explanation}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="qa-locked">
                    <p className="qa-locked-label">정답과 해설은 회원에게 공개됩니다</p>
                    {q.id == null ? (
                      <span className="qa-locked-note">준비 중인 예시 문제입니다</span>
                    ) : signedIn ? (
                      <button
                        type="button"
                        className="co-btn co-btn--primary co-btn--sm"
                        onClick={() => reveal(q.id!)}
                        disabled={busy}
                      >
                        {busy ? "여는 중…" : "정답·해설 보기"}
                      </button>
                    ) : (
                      <Link className="co-btn co-btn--primary co-btn--sm" href="/join">
                        회원 등록하고 보기 <i aria-hidden="true">→</i>
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {error && (
        <p className="qa-error" role="alert">
          {error}
        </p>
      )}

      {!signedIn && questions.length > 0 && (
        <p className="qa-foot co-reveal">
          이메일만으로 등록하실 수 있으며 별도 비용은 없습니다.{" "}
          <Link href="/login">이미 회원이시면 로그인</Link>
        </p>
      )}
    </section>
  );
}
