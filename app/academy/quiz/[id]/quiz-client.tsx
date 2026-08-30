"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuizQuestion } from "@/lib/questions-db";
import type { AnswerView } from "@/lib/answers";
import { PASS_SCORE, POINTS } from "@/lib/membership";

type MemberSummary = { tier: "free" | "paid"; points: number } | null;

/**
 * 해설 모자이크 밑에 깔리는 미끼 문단. 실제 해설은 서버에만 있고, 열람
 * 자격이 확인되기 전에는 어떤 형태로도 브라우저에 내려보내지 않는다 —
 * CSS 블러는 개발자 도구로 바로 벗겨지기 때문이다. 살짝 비치는 글자가
 * 궁금증을 만들되, 읽어도 얻는 게 없어야 한다.
 */
const DECOY_LINES = [
  "이 문제의 핵심은 표면의 논리가 아니라 거래 구조 전체를 지배하는 힘의 방향에 있습니다. 실무에서 이 지점을 놓치면 협상 후반에 반드시 대가를 치릅니다.",
  "모범답안이 전제하는 조건이 무너지는 순간이 있습니다. 40년의 실전 사례에서 그 순간은 예외 없이 같은 신호를 먼저 보냈습니다.",
  "계약서 조항 하나가 아니라 상대방 자문사의 인센티브 구조까지 읽어야 이 문제의 출제 의도에 닿습니다. 나머지 절반은 해설에서 확인하십시오.",
];

export default function QuizClient({
  question,
  member,
  myAnswer: initialAnswer,
  correctChoiceIndex: initialCorrect,
  unlockedExplanation,
  authConfigured,
}: {
  question: QuizQuestion;
  member: MemberSummary;
  myAnswer: AnswerView | null;
  correctChoiceIndex?: number;
  unlockedExplanation?: string;
  authConfigured: boolean;
}) {
  const [myAnswer, setMyAnswer] = useState<AnswerView | null>(initialAnswer);
  const [correctIndex, setCorrectIndex] = useState<number | undefined>(initialCorrect);
  const [points, setPoints] = useState(member?.points ?? 0);
  const [essay, setEssay] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [awardNote, setAwardNote] = useState("");

  const [explanation, setExplanation] = useState<string | null>(unlockedExplanation ?? null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [revealError, setRevealError] = useState("");

  const isPaid = member?.tier === "paid";
  const isChoiceFormat = question.format === "객관식";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isChoiceFormat
            ? { questionId: question.id, choiceIndex: choice }
            : { questionId: question.id, body: essay }
        ),
      });
      const data = (await res.json()) as {
        error?: string;
        answer?: AnswerView;
        pointsAwarded?: number;
        pointsLeft?: number;
        correctChoiceIndex?: number;
      };
      if (!res.ok || !data.answer) {
        setError(data.error ?? "제출하지 못했습니다. 잠시 후 다시 시도해 주십시오.");
        return;
      }
      setMyAnswer(data.answer);
      setCorrectIndex(data.correctChoiceIndex);
      if (typeof data.pointsLeft === "number") setPoints(data.pointsLeft);
      if (data.pointsAwarded) setAwardNote(`통과 — 퀴즈 포인트 +${data.pointsAwarded}P 적립`);
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도해 주십시오.");
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    setRevealBusy(true);
    setRevealError("");
    try {
      const res = await fetch("/api/explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id }),
      });
      const data = (await res.json()) as { error?: string; explanation?: string; pointsLeft?: number };
      if (!res.ok || !data.explanation) {
        setRevealError(data.error ?? "해설을 열지 못했습니다.");
        return;
      }
      setExplanation(data.explanation);
      if (typeof data.pointsLeft === "number") setPoints(data.pointsLeft);
    } catch {
      setRevealError("네트워크 오류입니다. 잠시 후 다시 시도해 주십시오.");
    } finally {
      setRevealBusy(false);
    }
  }

  const graded = myAnswer?.status === "graded";

  return (
    <div className="quiz-card">
      <p className="me-eyebrow">문제 풀이</p>
      <div className="quiz-tags">
        <span className="exam-tag">{question.trackLabel}</span>
        <span className={`exam-tag ${question.levelClass}`}>{question.level}</span>
        <span className="exam-tag">{question.format}</span>
      </div>
      <h1 className="quiz-prompt">{question.prompt}</h1>

      {/* ── 답안 영역 ─────────────────────────────────────────── */}
      {!member ? (
        <div className="quiz-gate">
          <p>답안 제출은 아카데미 회원에게 열립니다. 무료 가입으로 L1 입문 문제부터 풀 수 있습니다.</p>
          {authConfigured ? (
            <p className="quiz-gate-actions">
              <Link className="button button-red" href="/academy/login">로그인</Link>
              <Link className="button" href="/academy/join">회원가입</Link>
            </p>
          ) : (
            <p>회원 기능 준비가 끝나면 이 자리에서 바로 풀 수 있습니다.</p>
          )}
        </div>
      ) : !myAnswer ? (
        <form className="quiz-form" onSubmit={submit}>
          {isChoiceFormat ? (
            <fieldset className="quiz-choices">
              <legend>보기 중 하나를 고르십시오</legend>
              {(question.choices ?? []).map((c, i) => (
                <label key={i} className={choice === i ? "is-picked" : ""}>
                  <input
                    type="radio"
                    name="choice"
                    checked={choice === i}
                    onChange={() => setChoice(i)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <label className="quiz-essay">
              답안 서술 <small>30자 이상 — 논리가 무너지는 조건까지 짚어야 높이 평가됩니다</small>
              <textarea
                rows={10}
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder="결론부터 쓰고, 그 결론이 실전에서 흔들리는 조건을 함께 서술하십시오."
              />
            </label>
          )}
          <div className="quiz-actions">
            <button
              className="button button-red"
              disabled={busy || (isChoiceFormat ? choice === null : essay.trim().length < 30)}
            >
              {busy ? "제출 중…" : "답안 제출"}
            </button>
            <span className="quiz-points">보유 포인트 {points.toLocaleString()}P</span>
          </div>
          <p className="quiz-once">한 문제는 한 번만 제출할 수 있습니다. 제출 후 수정되지 않습니다.</p>
          {error && <p className="quiz-error">{error}</p>}
        </form>
      ) : (
        <div className="quiz-result">
          {/* 점수·상태 */}
          {graded ? (
            <div className={`quiz-score ${myAnswer.pass ? "is-pass" : "is-fail"}`}>
              <span className="quiz-score-num">{myAnswer.score}점</span>
              <span className="quiz-score-label">
                {myAnswer.pass ? `통과 (${PASS_SCORE}점 이상)` : `미통과 (${PASS_SCORE}점 미만)`}
                {myAnswer.gradedBy === "admin" && " · 성보경 회장 채점"}
                {myAnswer.gradedBy === "ai" && " · AI 채점"}
                {myAnswer.gradedBy === "auto" && " · 자동 채점"}
              </span>
            </div>
          ) : (
            <div className="quiz-score is-pending">
              <span className="quiz-score-num">채점 대기</span>
              <span className="quiz-score-label">
                성보경 회장의 채점 후 점수가 표시됩니다. 통과하면 +{POINTS.perQuiz}P가 적립됩니다.
              </span>
            </div>
          )}
          {awardNote && <p className="quiz-award">{awardNote}</p>}

          {/* 내 답안 */}
          <div className="quiz-mine">
            <h2>내 답안</h2>
            <p>{myAnswer.body}</p>
          </div>

          {/* 정답 표시 — 객관식은 채점 후 정답 보기를 보여준다 */}
          {graded && isChoiceFormat && typeof correctIndex === "number" && (
            <div className="quiz-correct">
              <h2>정답</h2>
              <p>
                {"①②③④⑤⑥⑦⑧⑨⑩"[correctIndex] ?? correctIndex + 1}{" "}
                {(question.choices ?? [])[correctIndex]}
              </p>
            </div>
          )}

          {/* 채점 강평 */}
          {graded && myAnswer.feedback && (
            <div className="quiz-feedback">
              <h2>채점 강평</h2>
              <p>{myAnswer.feedback}</p>
            </div>
          )}

          {/* ── 해설 — 정답 표시 아래. 무료는 모자이크, 유료는 클릭 해제 ── */}
          {question.hasExplanation && (
            <div className="quiz-expl">
              <h2>성보경 회장 해설</h2>
              {explanation ? (
                <div className="quiz-expl-body is-open">
                  {explanation.split(/\n{2,}/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : (
                <div className="quiz-expl-locked">
                  <div className="quiz-expl-mosaic" aria-hidden="true">
                    {DECOY_LINES.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  <div className="quiz-expl-veil">
                    {isPaid ? (
                      <>
                        <p>해설이 잠겨 있습니다.</p>
                        <button className="button button-red" onClick={reveal} disabled={revealBusy}>
                          {revealBusy ? "여는 중…" : `해설 열람 (${POINTS.perExplanation}P)`}
                        </button>
                        <small>한 번 연 해설은 다시 차감되지 않습니다 · 보유 {points.toLocaleString()}P</small>
                      </>
                    ) : (
                      <>
                        <p>유료회원에게 열리는 해설입니다.</p>
                        <small>
                          실전에서 논리가 무너지는 조건까지 짚는 회장 해설은 유료회원 전환 후
                          포인트로 열람합니다.
                        </small>
                        <Link className="button" href="/academy/billing">
                          유료회원 전환 안내
                        </Link>
                      </>
                    )}
                    {revealError && <p className="quiz-error">{revealError}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="quiz-back">
        <Link href="/academy#exam">← 다른 문제 보기</Link>
        {member && <Link href="/academy/me">내 학습 현황 →</Link>}
      </p>
    </div>
  );
}
