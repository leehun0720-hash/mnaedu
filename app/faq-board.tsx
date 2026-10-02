import type { FaqBoard } from "@/lib/qna-db";

/**
 * 자주 묻는 질문 — 게시판 모양.
 *
 * 회장 지시(2026-10-02): 올린 질문이 쌓여 게시판 형태로 남게. 묻고 답하기
 * 게시판과 같은 줄 모양(번호 · 제목 · 날짜, 눌러 펴기)을 쓴다. 첫 화면과
 * Q&A 화면이 같은 것을 그리므로 한 곳에 둔다.
 */
export default function FaqBoardList({ board }: { board: FaqBoard }) {
  if (board.rows.length === 0) {
    return <p className="qa-empty">아직 올라온 자주 묻는 질문이 없습니다.</p>;
  }
  return (
    <ol className="qa-list qa-list--board qa-list--faq">
      {board.rows.map((f) => (
        <li key={f.id}>
          <details className="qa-item">
            <summary>
              <span className="qa-no">{f.no}</span>
              <span className="qa-title">{f.question}</span>
              {f.postedOn && (
                <span className="qa-meta">
                  <time dateTime={f.postedOn}>{f.postedOn}</time>
                </span>
              )}
              <i aria-hidden="true">+</i>
            </summary>
            <div className="qa-body">
              <div className="qa-a">
                <p>{f.answer}</p>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}
