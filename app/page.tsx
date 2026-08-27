import Link from "next/link";
import { ORBIT_WORDS } from "@/lib/company";

/**
 * 메인 게이트 — 두 얼굴의 공용 현관.
 *
 * 기업 홈페이지(의뢰인)와 퀴즈 아카데미(수련자)는 성격이 다른 별개의
 * 사이트이므로, 첫 화면은 어느 쪽도 아닌 중립 지대에서 방문 목적만 갈라
 * 보낸다. 서로를 잇는 문은 이 두 개의 버튼이 전부다(기획서 2장).
 *
 * 로고를 중심으로 Mergers · Acquisitions · Divestitures · Epochmaking 네
 * 단어가 도는 움직임은 회장이 직접 설계한 첫 페이지 컨셉이다.
 */
export default function Gate() {
  return (
    <div className="gate">
      <header className="gate-top">
        <span className="gate-wordmark">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
          <img src="/logo-frontier-group-white.svg" alt="" width={30} height={26} aria-hidden="true" />
          <span>
            FRONTIER M&amp;A
            <i>SINCE 1993</i>
          </span>
        </span>
      </header>

      <main className="gate-main">
        <div className="gate-hero">
        <div className="gate-orbitwrap" aria-hidden="true">
          <div className="gate-ring">
            {ORBIT_WORDS.map((w, i) => (
              <span key={w} className="gate-orbit-word" style={{ ["--slot" as string]: i }}>
                {w}
              </span>
            ))}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
          <img className="gate-mark" src="/logo-frontier-group-white.svg" alt="" width={92} height={80} />
        </div>

        <h1 className="gate-title">
          ㈜프론티어 M&amp;A
          <span className="gate-title-en" aria-hidden="true">
            {ORBIT_WORDS.join(" · ")}
          </span>
        </h1>
        <p className="gate-lede">
          1993년 국내 최초의 M&amp;A 전문중개회사로 출발하여{" "}
          <br className="br-wide" />
          우리나라 M&amp;A 시장의 역사를 만들어 왔습니다.
        </p>
        </div>

        <nav className="gate-doors" aria-label="입장 선택">
        <Link className="gate-door gate-door--company" href="/company">
          <span className="gate-door-eyebrow">CORPORATE</span>
          <strong className="gate-door-name">기업 홈페이지</strong>
          <span className="gate-door-desc">업무를 의뢰하시는 분을 위한 공간</span>
          <span className="gate-door-items">회사 소개 · 주요 업무 · 인사이트 · 문의</span>
          <span className="gate-door-cta">
            입장하기 <i aria-hidden="true">→</i>
          </span>
        </Link>

        <Link className="gate-door gate-door--academy" href="/academy">
          <span className="gate-door-eyebrow">ACADEMY</span>
          <strong className="gate-door-name">M&amp;A 아카데미</strong>
          <span className="gate-door-desc">실력을 기르고 검증받는 공간</span>
          <span className="gate-door-items">5레벨 문제 · 승급 · 선발 테스트</span>
          <span className="gate-door-cta">
            입장하기 <i aria-hidden="true">→</i>
          </span>
        </Link>
        </nav>
      </main>

      <footer className="gate-base">
        <small>© 2026 ㈜프론티어 M&amp;A. ALL RIGHTS RESERVED.</small>
        <small className="gate-partner">
          AI SYSTEM PARTNER · <a href="https://tenai.kr" target="_blank" rel="noopener noreferrer">TEN AI</a>
        </small>
      </footer>
    </div>
  );
}
