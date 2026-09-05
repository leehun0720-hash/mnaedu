import type { PublicDocument } from "@/lib/documents";

/**
 * 자료실.
 *
 * 회장이 워드 문서를 올리면 그대로 여기 선다. 로그인도 회원 확인도 없다 —
 * 자료는 실력을 보여 주기 위해 두는 것이므로 문턱을 두지 않는다.
 */
function formatSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LibrarySection({ documents }: { documents: PublicDocument[] }) {
  return (
    <section className="co-section co-section--tint" id="library">
      <div className="co-section-head co-reveal">
        <p className="co-section-index">06 · LIBRARY</p>
        <h2>자료실</h2>
        <p className="co-section-note">
          업무 자료와 회장 칼럼을 올려 둡니다. 내려받아 그대로 보실 수 있습니다.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="co-empty co-reveal">
          <strong>자료를 준비하고 있습니다</strong>
          <p>게재가 시작되면 이 자리에 최신 자료가 올라옵니다.</p>
        </div>
      ) : (
        <ul className="lib-list co-reveal">
          {documents.map((d) => (
            <li key={d.id} className="lib-item">
              <div className="lib-meta">
                <span className="lib-kind">{d.kind}</span>
                {d.trackLabel && <span className="lib-track">{d.trackLabel}</span>}
                <time className="lib-date">{d.createdAt}</time>
              </div>
              <div className="lib-body">
                <strong className="lib-title">{d.title}</strong>
                {d.summary && <p className="lib-summary">{d.summary}</p>}
              </div>
              <a className="lib-download" href={`/api/documents/${d.id}`}>
                내려받기
                <span className="lib-size">{formatSize(d.fileSize)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
