import Link from "next/link";
import { MADE_WORDS, SLOGAN } from "@/lib/company";
import CopyGuard from "./copy-guard";

/**
 * 게이트웨이 — 두 사이트의 공통 관문 (기획 보고서 3.1).
 *
 * 설계서의 첫 페이지 요소 그대로: MADE 로고 애니메이션(로고를 중심으로 네
 * 단어가 회전) + 슬로건 + [기업 홈페이지] · [퀴즈 아카데미] 진입 버튼.
 * 의뢰인과 수련자는 목적이 다르므로 어느 쪽도 아닌 중립 지대에서 갈라 보낸다.
 */
export default function Gate() {
  return (
    <div className="gate">
      <CopyGuard />

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
              {MADE_WORDS.map((w, i) => (
                <span key={w.word} className="gate-orbit-word" style={{ ["--slot" as string]: i }}>
                  <b>{w.word.charAt(0)}</b>
                  {w.word.slice(1)}
                </span>
              ))}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
            <img className="gate-mark" src="/logo-frontier-group-white.svg" alt="" width={92} height={80} />
          </div>

          <h1 className="gate-title">
            ㈜프론티어 M&amp;A
            <span className="gate-title-en" aria-hidden="true">
              {MADE_WORDS.map((w) => w.word).join(" · ")}
            </span>
          </h1>
          <p className="gate-lede">{SLOGAN}</p>
        </div>

        <nav className="gate-doors" aria-label="입장 선택">
          <Link className="gate-door gate-door--company" href="/company">
            <span className="gate-door-eyebrow">CORPORATE</span>
            <strong className="gate-door-name">기업 홈페이지</strong>
            <span className="gate-door-desc">업무를 의뢰하시는 분을 위한 공간</span>
            <span className="gate-door-items">회사소개 · 주요업무 5분야 · 채용 · 문의</span>
            <span className="gate-door-cta">
              입장하기 <i aria-hidden="true">→</i>
            </span>
          </Link>

          <Link className="gate-door gate-door--academy" href="/academy">
            <span className="gate-door-eyebrow">ACADEMY</span>
            <strong className="gate-door-name">퀴즈 아카데미</strong>
            <span className="gate-door-desc">학습하며 검증받는 공간</span>
            <span className="gate-door-items">회원가입 · 5레벨 퀴즈 · 포인트 해설</span>
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
