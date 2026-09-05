import Link from "next/link";

/**
 * 우측 고정 바.
 *
 * 사이트가 하나로 합쳐지면서 "두 사이트를 잇는 문" 역할은 사라졌다. 남은
 * 것은 이 페이지에서 할 수 있는 두 가지 행동뿐이다 — 상담을 신청하거나,
 * 정답·해설을 보려고 등록하는 것.
 *
 * 훅을 쓰지 않는 순수 컴포넌트라 서버 페이지와 클라이언트 트리 양쪽에서
 * 그대로 쓸 수 있다.
 */
export default function SiteRail({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <nav className="site-rail" aria-label="바로가기">
      <a className="rail-item rail-item--switch" href="#questions">
        <i className="rail-icon" aria-hidden="true">
          ◆
        </i>
        <span className="rail-label">
          실무
          <br />
          문제
        </span>
      </a>

      <a className="rail-item" href="#library">
        <i className="rail-icon" aria-hidden="true">
          ▤
        </i>
        <span className="rail-label">
          자료실
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

      <a className="rail-item rail-item--cta" href="#contact">
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
