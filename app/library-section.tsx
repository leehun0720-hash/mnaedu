import Link from "next/link";
import type { LibraryEntry } from "@/lib/library-merge";

/**
 * 자료실.
 *
 * 회장이 올린 것이 그대로 여기 선다. 로그인도 회원 확인도 없다 — 자료는
 * 실력을 보여 주기 위해 두는 것이므로 문턱을 두지 않는다.
 *
 * 한 목록에 두 가지가 선다. 내려받는 파일과, 그 자리에서 읽는 글이다. 회장이
 * 올리시는 곳은 다르지만(자료실 탭 · 칼럼 탭) 보시는 분에게는 같은 자료실이다.
 */
export default function LibrarySection({
  entries,
  index = "06 · LIBRARY",
  title = "업무자료",
  note = "업무 자료와 회장 칼럼을 올려 둡니다. 내려받거나 그 자리에서 읽으실 수 있습니다.",
  stages,
  pager,
}: {
  entries: LibraryEntry[];
  index?: string;
  title?: string;
  note?: string;
  /** 기초·심화 고르기 — 업무 화면에서만 넣는다 */
  stages?: React.ReactNode;
  pager?: React.ReactNode;
}) {
  return (
    <section className="co-section co-section--tint" id="library">
      <div className="co-section-head co-reveal">
        <p className="co-section-index">{index}</p>
        <h2>{title}</h2>
        <p className="co-section-note">{note}</p>
        {stages}
      </div>

      {entries.length === 0 ? (
        <div className="co-empty co-reveal">
          <strong>자료를 준비하고 있습니다</strong>
          <p>게재가 시작되면 이 자리에 최신 자료가 올라옵니다.</p>
        </div>
      ) : (
        <ul className="lib-list co-reveal">
          {entries.map((e) => (
            <li key={e.key} className="lib-item">
              <div className="lib-meta">
                <span className="lib-kind">{e.kind}</span>
                {e.trackLabel && <span className="lib-track">{e.trackLabel}</span>}
                <time className="lib-date">{e.createdAt}</time>
              </div>
              <div className="lib-body">
                <strong className="lib-title">{e.title}</strong>
                {e.summary && <p className="lib-summary">{e.summary}</p>}
              </div>
              {/* 파일은 내려받고, 글은 그 자리에서 읽는다 — 단추의 말이 달라야
                  무엇을 누르는지 알 수 있다 */}
              {e.file ? (
                <a className="lib-download" href={e.href}>
                  내려받기
                  <span className="lib-size">{e.size}</span>
                </a>
              ) : (
                <Link className="lib-download" href={e.href}>
                  읽기
                  <span className="lib-size">본문</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {pager}
    </section>
  );
}
