import Link from "next/link";

/**
 * 우측 고정 바.
 *
 * 사이트가 하나로 합쳐지면서 "두 사이트를 잇는 문" 역할은 사라졌다. 남은
 * 것은 이 페이지에서 할 수 있는 두 가지 행동뿐이다 — 상담을 신청하거나,
 * 정답·해설을 보려고 등록하는 것.
 *
 * 링크는 화면마다 실제로 있는 자리를 가리켜야 한다(회장 지적 2026-10-02:
 * "아직 연결 링크가 없습니다"). 전에는 #questions · #library · #contact 를
 * 어느 화면에서나 같은 화면 안의 자리로 걸었다. 그런데 실무문제와 업무정보실은
 * 주요업무 화면에만 있고, 첫 화면 · Q&A · 채용 화면에는 그 자리가 없어 눌러도
 * 아무 일이 없었다.
 *
 *   area 를 주면 — 그 주요업무 화면의 실무문제 · 업무정보실로 간다.
 *                 here 이면 같은 화면 안에서 움직인다.
 *   area 가 없으면 — 첫 화면 「새로 올라온 자료와 문제」의 두 칸으로 간다.
 *                 거기서 분야별 화면으로 들어간다.
 *   상담신청 — 주요업무 화면에서는 그 화면의 상담 칸, 나머지는 첫 화면의 상담 칸.
 *
 * 훅을 쓰지 않는 순수 컴포넌트라 서버 페이지와 클라이언트 트리 양쪽에서
 * 그대로 쓸 수 있다.
 */
export function railLinks(area?: string | null, here = false) {
  const base = area ? (here ? "" : `/business/${area}`) : null;
  return {
    questions: base !== null ? `${base}#questions` : "/#updates-questions",
    library: base !== null ? `${base}#library` : "/#updates-library",
    contact: area && here ? "#contact" : "/#contact",
  };
}

export default function SiteRail({
  signedIn = false,
  area,
  here = false,
}: {
  signedIn?: boolean;
  /** 주요업무 분야(slug) — 그 분야 화면의 실무문제 · 업무정보실로 잇는다 */
  area?: string | null;
  /** 지금 그 분야 화면 위에 있는가 — 그렇다면 화면 안에서 움직인다 */
  here?: boolean;
}) {
  const links = railLinks(area, here);
  return (
    <nav className="site-rail" aria-label="바로가기">
      <a className="rail-item rail-item--switch" href={links.questions}>
        <i className="rail-icon" aria-hidden="true">
          ◆
        </i>
        <span className="rail-label">
          실무
          <br />
          문제
        </span>
      </a>

      <a className="rail-item" href={links.library}>
        <i className="rail-icon" aria-hidden="true">
          ▤
        </i>
        <span className="rail-label">
          업무정보실
        </span>
      </a>

      {signedIn ? (
        <form action="/api/auth/logout" method="post" className="rail-form">
          <button className="rail-item" type="submit">
            <i className="rail-icon" aria-hidden="true">
              ○
            </i>
            <span className="rail-label">로그아웃</span>
          </button>
        </form>
      ) : (
        <Link className="rail-item" href="/login">
          <i className="rail-icon" aria-hidden="true">
            ○
          </i>
          <span className="rail-label">
            회원
            <br />
            로그인
          </span>
        </Link>
      )}

      <a className="rail-item rail-item--cta" href={links.contact}>
        <i className="rail-icon" aria-hidden="true">
          ✉
        </i>
        <span className="rail-label">
          상담
          <br />
          신청
        </span>
      </a>
    </nav>
  );
}
