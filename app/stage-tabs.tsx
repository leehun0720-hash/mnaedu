import Link from "next/link";
import { STAGES, type Stage } from "@/lib/questions";

/**
 * 단계 고르기 — 전체 · 기초 · 심화.
 *
 * 회장 지시(2026-09): 한 분야 안에서도 자료와 문제를 기초와 심화로 나눠
 * 보이게 한다. 잠그는 것이 아니라 고르는 것이므로 회원 여부를 묻지 않고,
 * 주소에 남겨 그대로 공유하실 수 있게 한다.
 *
 * 단계를 바꾸면 쪽 번호는 1로 돌아간다 — 3쪽까지 넘긴 뒤 단계를 바꾸면
 * 그 단계에는 3쪽이 없어 빈 화면이 나오기 때문이다.
 */
export default function StageTabs({
  current,
  param,
  basePath,
  hash,
  keep,
}: {
  current: Stage | null;
  /** 이 게시판이 쓰는 주소 이름 — 한 화면에 게시판이 둘이라 서로 달라야 한다 */
  param: string;
  basePath: string;
  hash: string;
  /** 다른 게시판이 보고 있던 단계는 그대로 둔다 */
  keep?: Record<string, string | undefined>;
}) {
  function href(value: string) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep ?? {})) if (v) q.set(k, v);
    if (value) q.set(param, value);
    const query = q.toString();
    return `${basePath}${query ? `?${query}` : ""}#${hash}`;
  }

  return (
    <div className="co-stages" role="group" aria-label="단계 고르기">
      <Link className="co-stage" data-on={current === null} href={href("")}>
        전체
      </Link>
      {STAGES.map((s) => (
        <Link key={s} className="co-stage" data-on={current === s} href={href(s)}>
          {s}
        </Link>
      ))}
    </div>
  );
}
