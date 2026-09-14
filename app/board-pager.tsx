import Link from "next/link";

/**
 * 게시판 쪽 넘김 — 한 면에 10개씩 (회장 지시 12).
 *
 * 주소에 쪽 번호를 실어 서버에서 잘라 온다. 목록이 한 면에 다 들어가면
 * 아무것도 그리지 않는다 — 세 건뿐인 게시판에 페이지 단추를 보일 이유가 없다.
 */
export const BOARD_PAGE_SIZE = 10;

export default function BoardPager({
  page,
  total,
  param,
  basePath,
  hash,
  keep,
}: {
  page: number;
  total: number;
  /** 주소에 실을 이름 — 한 화면에 게시판이 둘이므로 서로 달라야 한다 */
  param: string;
  basePath: string;
  hash: string;
  /** 고르신 단계 같은 다른 조건 — 쪽을 넘겨도 그대로 지고 간다 */
  keep?: Record<string, string | undefined>;
}) {
  const last = Math.max(1, Math.ceil(total / BOARD_PAGE_SIZE));
  if (last <= 1) return null;
  const from = (page - 1) * BOARD_PAGE_SIZE + 1;
  const to = Math.min(page * BOARD_PAGE_SIZE, total);
  // 쪽만 갈아 끼우고 나머지 조건은 그대로 싣는다 — 2쪽으로 넘겼더니 고른
  // 단계가 풀리면, 보고 계시던 목록이 통째로 바뀐다
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep ?? {})) if (v) q.set(k, v);
    q.set(param, String(p));
    return `${basePath}?${q}#${hash}`;
  };

  return (
    <nav className="co-pager" aria-label="쪽 넘김">
      {page > 1 ? (
        <Link className="co-pager-btn" href={href(page - 1)}>
          ← 이전
        </Link>
      ) : (
        <span className="co-pager-btn is-off">← 이전</span>
      )}
      <span className="co-pager-state">
        {from}–{to} / 전체 {total}건 · {page}/{last}쪽
      </span>
      {page < last ? (
        <Link className="co-pager-btn" href={href(page + 1)}>
          다음 →
        </Link>
      ) : (
        <span className="co-pager-btn is-off">다음 →</span>
      )}
    </nav>
  );
}
