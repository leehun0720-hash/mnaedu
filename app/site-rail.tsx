import Link from "next/link";

/**
 * 우측 고정 내비게이션 바 (설계서 · 기획 보고서 3.1).
 *
 * 두 사이트를 잇는 문이자 상담 접점이다. 기업 홈페이지에서는 아카데미로,
 * 아카데미에서는 홈페이지로 건너가고, 각 사이트에 맞는 행동(상담신청 /
 * 가입·로그인)을 하나씩 둔다. 회원가입 창구는 아카데미로 단일화되어 있으므로
 * 홈페이지 쪽에는 가입 항목을 두지 않는다 (보고서 4.3).
 *
 * 훅을 쓰지 않는 순수 컴포넌트라 서버 페이지와 클라이언트 트리 양쪽에서
 * 그대로 쓸 수 있다.
 */
export default function SiteRail({ site }: { site: "company" | "academy" }) {
  const isCompany = site === "company";

  return (
    <nav className="site-rail" data-site={site} aria-label="사이트 이동">
      <Link className="rail-item rail-item--switch" href={isCompany ? "/academy" : "/company"}>
        <i className="rail-icon" aria-hidden="true">
          {isCompany ? "◆" : "■"}
        </i>
        <span className="rail-label">
          {isCompany ? (
            <>
              퀴즈
              <br />
              아카데미
            </>
          ) : (
            <>
              기업
              <br />
              홈페이지
            </>
          )}
        </span>
      </Link>

      {isCompany ? (
        <a className="rail-item rail-item--action" href="#contact">
          <i className="rail-icon" aria-hidden="true">
            ✎
          </i>
          <span className="rail-label">
            상담
            <br />
            신청
          </span>
        </a>
      ) : (
        <a className="rail-item rail-item--action" href="#membership">
          <i className="rail-icon" aria-hidden="true">
            ⊕
          </i>
          <span className="rail-label">
            가입
            <br />
            로그인
          </span>
        </a>
      )}

      <Link className="rail-item rail-item--home" href="/">
        <i className="rail-icon" aria-hidden="true">
          ⌂
        </i>
        <span className="rail-label">메인</span>
      </Link>
    </nav>
  );
}
