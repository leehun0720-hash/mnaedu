import Link from "next/link";
import type { PublicDocument } from "@/lib/documents";
import type { PublicQuestion } from "@/lib/questions";

/**
 * 첫 화면 게시판 — 업무영역 바로 아래.
 *
 * 새로 올라온 업무자료와 평가문제를 다섯 건씩만 보여 준다(회장 지시 1-1).
 * 본문은 각 주요업무 화면에 두고, 여기서는 "새로 올라왔다"는 사실만 알린다 —
 * 첫 화면은 목록을 읽는 자리가 아니라 들어갈 문을 고르는 자리다.
 */
const PREVIEW_COUNT = 5;

function trackHref(track: string | null | undefined, hash: string): string {
  return track ? `/business/${track}#${hash}` : "/#business";
}

export default function UpdatesSection({
  documents,
  questions,
}: {
  documents: PublicDocument[];
  questions: PublicQuestion[];
}) {
  const docs = documents.slice(0, PREVIEW_COUNT);
  const quiz = questions.slice(0, PREVIEW_COUNT);

  return (
    <section className="co-section" id="updates">
      <div className="co-section-head co-reveal">
        <p className="co-section-index">03 · UPDATES</p>
        <h2>새로 올라온 자료와 문제</h2>
      </div>

      <div className="co-updates co-reveal">
        <div className="co-updates-col">
          <div className="co-updates-head">
            <h3>업무자료</h3>
            <span className="co-updates-count">최근 {docs.length}건</span>
          </div>
          {docs.length === 0 ? (
            <p className="co-updates-empty">아직 올라온 업무자료가 없습니다.</p>
          ) : (
            <ul className="co-updates-list">
              {docs.map((d) => (
                <li key={d.id}>
                  <Link href={trackHref(d.track, "library")}>
                    <span className="co-updates-title">{d.title}</span>
                    <span className="co-updates-meta">
                      {d.trackLabel ?? d.kind}
                      <i aria-hidden="true"> · </i>
                      {d.createdAt}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="co-updates-col">
          <div className="co-updates-head">
            <h3>평가문제</h3>
            <span className="co-updates-count">최근 {quiz.length}건</span>
          </div>
          {quiz.length === 0 ? (
            <p className="co-updates-empty">아직 올라온 평가문제가 없습니다.</p>
          ) : (
            <ul className="co-updates-list">
              {quiz.map((q) => (
                <li key={q.id ?? q.no}>
                  <Link href={trackHref(q.track, "questions")}>
                    {/* 문제 본문은 길다 — 목록에서는 한 줄로 자른다 */}
                    <span className="co-updates-title">{q.prompt}</span>
                    <span className="co-updates-meta">
                      {q.trackLabel}
                      <i aria-hidden="true"> · </i>
                      {q.type}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
