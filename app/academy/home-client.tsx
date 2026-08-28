"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BUSINESS_AREAS, TOTAL_TOPICS } from "@/lib/company";
import { LEVEL_TIERS, QUESTIONS_PER_QUIZ, type PublicQuestion } from "@/lib/questions";
import CopyGuard from "../copy-guard";
import SiteRail from "../site-rail";
import StudioPanel, { HERO_VARIANTS } from "./studio-panel";

/**
 * 문제은행 가로축 — 홈페이지 게시판과 같은 5분야 정본을 그대로 쓴다.
 * 한 문제가 '경영권 분쟁 > 델라웨어 판례 > L5'로 분류되도록, 분야·주제는
 * lib/company.ts 한 곳에서만 정의한다 (기획 보고서 4.2).
 */
const tracks = BUSINESS_AREAS.map((b, i) => ({
  slug: b.slug,
  number: String(i + 1).padStart(2, "0"),
  title: b.name,
  en: b.en,
  description: b.line,
  topics: b.curriculum,
  masterTip: b.masterTip,
  offlineOnly: b.offlineOnly ?? false,
}));

// 회원 등급 — 가입 창구는 아카데미 하나뿐이다 (보고서 4.3)
const memberTiers = [
  {
    key: "free",
    name: "무료회원",
    scope: "기초적인 초기 정보 + L1 입문 퀴즈",
    purpose: "먼저 풀어보며 수준을 가늠하는 단계입니다.",
    items: ["L1 입문 퀴즈 응시", "포인트 적립", "포인트로 해설 열람"],
  },
  {
    key: "paid",
    name: "유료회원",
    scope: "L1 + L2~L5 전문가 퀴즈 전 범위",
    purpose: "학습 · 검증 · 승급, 그리고 오프라인 초대 후보가 되는 단계입니다.",
    items: ["L2~L5 전문가 퀴즈", "델라웨어 판례 해설", "회장 직강 스트리밍", "초전문가 과정 초대 검토"],
  },
];

// 수강 여정 — 온라인은 선별 장치이고, 본체는 오프라인 초전문가 과정이다
const funnelSteps = [
  {
    index: "STEP 01",
    name: "무료 가입",
    desc: "기초 정보와 L1 입문 퀴즈를 무료로 풀며 지금 수준을 가늠합니다.",
    gate: false
  },
  {
    index: "STEP 02",
    name: "유료 전환",
    desc: "L2~L5 전문가 퀴즈가 열립니다. 풀며 쌓은 포인트로 회장 해설을 엽니다.",
    gate: false
  },
  {
    index: "STEP 03",
    name: "레벨 승급",
    desc: "레벨별 커트라인을 통과해야 다음 레벨이 열립니다. 여기서 걸러집니다.",
    gate: true
  },
  {
    index: "STEP 04",
    name: "오프라인 초대",
    desc: "학습 이력과 성취동기를 분석해 선별하고, 초전문가 과정에 초대합니다.",
    gate: false
  }
];

// 5레벨 승급 체계 (기획서 4.2 — 명칭·커트라인은 확정 전의 안)
const levelLadder = LEVEL_TIERS;

const levelRules = [
  { title: "승급", desc: "레벨별 응시 후 커트라인을 통과해야 다음 레벨이 열립니다." },
  { title: "등급 비공개", desc: "본인 등급은 기본 비공개이며, 노출 여부는 본인이 설정합니다." },
  {
    title: "L5를 넘어서면",
    desc: "학습 이력과 성취동기 분석을 거쳐 초전문가 과정 초대장 발급을 검토합니다. 자동 합격이 아닙니다.",
  },
];

// 등급별로 열리는 범위
const permissionMatrix = {
  columns: ["비회원", "무료회원", "유료회원", "L5 통과"],
  rows: [
    { label: "업무 소개 · 커리큘럼 열람", cells: ["O", "O", "O", "O"] },
    { label: "L1 입문 퀴즈", cells: ["X", "O", "O", "O"] },
    { label: "L2~L5 전문가 퀴즈", cells: ["X", "X", "O", "O"] },
    { label: "포인트로 회장 해설 열람", cells: ["X", "L1 범위", "O", "O"] },
    { label: "델라웨어 판례 해설", cells: ["X", "X", "O", "O"] },
    { label: "회장 직강 스트리밍", cells: ["X", "X", "O", "O"] },
    { label: "초전문가 과정 (오프라인)", cells: ["X", "X", "X", "심사 후 초대"] }
  ]
};

// Primary navigation — shared by the inline bar and the mobile drawer
// The five programmes are listed in the menu outright. They share one
// section, so each entry scrolls there and selects that programme.
const sectionItems = [
  { href: "#courses", label: "5개 분야", courseIndex: -1 },
  { href: "#funnel", label: "수강 여정", courseIndex: -1 },
  { href: "#membership", label: "회원 등급", courseIndex: -1 },
  { href: "#levels", label: "5레벨 체계", courseIndex: -1 },
  { href: "#exam", label: "선발 테스트", courseIndex: -1 },
  { href: "#offline", label: "오프라인 과정", courseIndex: -1 }
];

// 인라인 바는 섹션만 — 분야가 다섯이라 전부 펼치면 워드마크와 부딪힌다.
const navItems = sectionItems;

// 서랍에서는 분야까지 낱낱이 보여 준다 (좁은 화면에는 자리가 있다)
const drawerItems = [
  ...tracks.map((t, i) => ({ href: "#courses", label: t.title, courseIndex: i })),
  ...sectionItems
];


export default function Home({ weeklyExams }: { weeklyExams: PublicQuestion[] }) {
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const currentTrack = tracks[selectedTrackIndex];

  // Opening curtain: holds ~3s, lifts over 0.9s, then unmounts.
  // Rendered on the server too, so the page never flashes before it appears.
  const [loader, setLoader] = useState<"loading" | "exiting" | "done">("loading");
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Full sequence on the first view of a session only; afterwards it would
    // just be a toll on the way back in. sessionStorage (not localStorage) so
    // a fresh visit another day still gets the opening.
    let seen = false;
    try {
      seen = sessionStorage.getItem("fma-intro-seen") === "1";
    } catch {
      // Private mode or blocked storage — fall through and play it.
    }
    if (seen) {
      // Next tick rather than inline, so this stays a scheduled transition
      // like the others. The inline flag has already hidden the curtain, so
      // nothing is visible in the meantime.
      const skip = setTimeout(() => setLoader("done"), 0);
      return () => clearTimeout(skip);
    }
    try {
      sessionStorage.setItem("fma-intro-seen", "1");
    } catch {
      /* not fatal */
    }
    const open = setTimeout(() => setLoader("exiting"), 5000);
    const clear = setTimeout(() => setLoader("done"), 6100);
    return () => {
      clearTimeout(open);
      clearTimeout(clear);
    };
  }, []);

  // Count and meter share one rAF so they can never drift apart. Written
  // straight to the DOM — this component is large, and re-rendering it 60
  // times a second to move a number would be wasteful.
  useEffect(() => {
    // Only while the curtain is actually up: a returning visitor unmounts it
    // on the first tick, and there is nothing to drive.
    if (loader !== "loading") return;
    const count = countRef.current;
    const bar = barRef.current;
    if (!count || !bar) return;
    const paint = (v: number) => {
      count.textContent = String(Math.round(v * 100)).padStart(3, "0");
      bar.style.transform = `scaleX(${v})`;
    };
    const DURATION = 4600;
    const start = performance.now();
    const paintAt = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      // Decelerating, so it settles into 100 rather than snapping there
      paint(1 - Math.pow(1 - p, 2.2));
      return p;
    };
    let raf = 0;
    const tick = (now: number) => {
      if (paintAt(now) < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // The doors are on a timer, but rAF stalls whenever the window is
    // occluded or backgrounded — which would strand the count at 000 while
    // they opened anyway. This keeps it moving; both read the same clock, so
    // they cannot disagree.
    const poll = window.setInterval(() => {
      if (paintAt(performance.now()) >= 1) window.clearInterval(poll);
    }, 200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
    };
  }, [loader]);
  useEffect(() => {
    if (loader === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loader]);

  // The hero footage auto-plays and loops, so it needs a visible control
  // (WCAG 2.2.2 Pause, Stop, Hide).
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(true);
  useEffect(() => {
    const v = heroVideoRef.current;
    if (!v) return;
    // Track the element's own events rather than assuming our calls stuck:
    // the browser pauses playback on its own when the tab is hidden or the
    // device is saving power, and the control must not keep claiming to be
    // playing when it isn't.
    const sync = () => setVideoPlaying(!v.paused);
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    void v.play().catch(() => {});
    sync();
    return () => {
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
    };
  }, []);
  const toggleHeroVideo = () => {
    const v = heroVideoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };

  // Content settles in as each band enters the viewport
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      ".section-heading, .funnel-rail, .matrix-scroll, .exam-grid, .exam-notice, .exam-dossier, .verdict-container, .track-grid, .bank-window, .leveltest-grid, .levels-grid, .member-grid"
    );
    targets.forEach((el) => el.setAttribute("data-reveal", ""));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Header condenses once the hero has scrolled past
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Drawer navigation (tablet + mobile)
  const [isNavOpen, setIsNavOpen] = useState(false);
  useEffect(() => {
    if (!isNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsNavOpen(false);
    };
    // Close if the viewport grows back to where the inline nav reappears
    const mq = window.matchMedia("(min-width: 1100px)");
    const onChange = () => mq.matches && setIsNavOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
      document.body.style.overflow = "";
    };
  }, [isNavOpen]);

  // STUDIO — 미팅용 디자인 협의 모드. `?studio=1`로 켜고, 세션 동안 유지된다.
  // 패널을 닫으면 플래그와 함께 사라지므로 일반 방문자는 볼 일이 없다.
  const [studio, setStudio] = useState(false);
  const [heroVariant, setHeroVariant] = useState(0);
  useEffect(() => {
    let on = false;
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("studio") === "1") {
        sessionStorage.setItem("fma-studio", "1");
        on = true;
      } else {
        on = sessionStorage.getItem("fma-studio") === "1";
      }
    } catch {}
    if (!on) return;
    // Scheduled rather than inline, matching the loader's idiom above.
    const arm = setTimeout(() => setStudio(true), 0);
    return () => clearTimeout(arm);
  }, []);
  const closeStudio = () => {
    try {
      sessionStorage.removeItem("fma-studio");
    } catch {}
    setStudio(false);
    setHeroVariant(0);
  };
  const hero = HERO_VARIANTS[heroVariant];

  // Which gate question is on screen
  const [selectedExamIndex, setSelectedExamIndex] = useState(0);

  const handleSelectExam = (index: number) => setSelectedExamIndex(index);

  // Level Test State
  const [levelTestScore, setLevelTestScore] = useState<number | null>(null);
  const [levelTestAnswer, setLevelTestAnswer] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Level Test Evaluation Simulator
  const handleRunLevelTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelTestAnswer.trim()) return;

    // Evaluate response depth
    const score = levelTestAnswer.length > 80 ? 88 : 72;
    setLevelTestScore(score);
  };

  return (
    // has-rail: 우측 고정 바가 본문을 덮지 않도록 폭을 미리 좁혀 둔다
    <main className="has-rail">
      <CopyGuard />
      <SiteRail site="academy" />

      {/* Prevent FOUC by ensuring the loader covers the screen immediately before external CSS loads */}
      <style dangerouslySetInnerHTML={{ __html: `
        .loader { position: fixed; inset: 0; z-index: 9999; background: #17110F; display: grid; place-items: center; }
        .loader-door { position: absolute; top: 0; bottom: 0; width: 50.2%; background: #17110F; }
        .loader-door--l { left: 0; }
        .loader-door--r { right: 0; }
      `}} />
      {/* Without JS the curtain would never lift, so hide it outright */}
      <noscript>
        <style>{`.loader{display:none!important}`}</style>
      </noscript>

      {/* Opening sequence: the two halves of the mark converge (결합), the
          count runs to 100, the chairman's seal presses down, and the plate
          parts like a deal-room door. */}
      {loader !== "done" && (
        <div className="loader" data-state={loader} role="status" aria-label="페이지를 준비하는 중입니다">
          <div className="loader-door loader-door--l" aria-hidden="true" />
          <div className="loader-door loader-door--r" aria-hidden="true" />
          <div className="loader-seam" aria-hidden="true" />

          <div className="loader-inner">
            <div className="loader-markwrap" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
              <img className="loader-mark loader-mark--l" src="/logo-frontier-group-white.svg" alt="" width={46} height={46} />
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
              <img className="loader-mark loader-mark--r" src="/logo-frontier-group-white.svg" alt="" width={46} height={46} />
              <span className="loader-seal">
                <span>成 保</span>
                <span>慶 印</span>
              </span>
            </div>

            <p className="loader-word" aria-hidden="true">
              {"FRONTIER M&A ACADEMY".split("").map((ch, i) => (
                <span key={i} style={{ ["--i" as string]: i }}>
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </p>

            <p className="loader-line">기업의 결합을 설계하고,<br />더 높은 가치를 세웁니다</p>

            <div className="loader-meter" aria-hidden="true">
              <div className="loader-track"><span ref={barRef} /></div>
              <span className="loader-count" ref={countRef}>000</span>
            </div>
          </div>
        </div>
      )}

      {/* Header (BI/CI Compliance) */}
      <header className="site-header" data-scrolled={isScrolled}>
        <a className="brand-lockup" href="#top" aria-label="프론티어 M&A 아카데미 홈">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized; avoids coupling to a deploy-target image loader */}
          <img
            className="brand-symbol"
            src={isScrolled ? "/logo-frontier-group.svg" : "/logo-frontier-group-white.svg"}
            alt=""
            width={44}
            height={38}
            aria-hidden="true"
          />
          <span className="brand-wordmark">
            <span className="brand-name">FRONTIER GROUP</span>
            <span className="brand-descriptor">M&amp;A 아카데미</span>
          </span>
        </a>
        <nav className="primary-nav" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          {/* 게이트로 돌아가는 유일한 문(기획서 2장) */}
          <Link className="header-gate" href="/">메인</Link>
          <a className="header-login" href="#exam">선발 테스트 <span>↗</span></a>
          <button
            type="button"
            className="nav-toggle"
            aria-label={isNavOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isNavOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsNavOpen((v) => !v)}
          >
            <span className="nav-toggle-bars" data-open={isNavOpen}>
              <span /><span /><span />
            </span>
          </button>
        </div>
      </header>

      {/* Drawer navigation for tablet and mobile, where the inline nav is hidden */}
      <div
        className="nav-scrim"
        data-open={isNavOpen}
        onClick={() => setIsNavOpen(false)}
        aria-hidden="true"
      />
      <nav id="mobile-nav" className="mobile-nav" data-open={isNavOpen} aria-label="모바일 메뉴">
        <p className="mobile-nav-title">MENU</p>
        {drawerItems.map((item, idx) => (
          <a
            key={item.label}
            href={item.href}
            data-first-section={idx === tracks.length ? "true" : undefined}
            onClick={() => {
              if (item.courseIndex >= 0) {
                setSelectedTrackIndex(item.courseIndex);
              }
              setIsNavOpen(false);
            }}
          >
            <span>{item.label}</span>
            <i aria-hidden="true">→</i>
          </a>
        ))}
        <a className="button button-red mobile-nav-cta" href="#exam" onClick={() => setIsNavOpen(false)}>
          선발 테스트 <span>↗</span>
        </a>
        <Link className="mobile-nav-gate" href="/">
          <span>메인 게이트로</span>
          <i aria-hidden="true">⌂</i>
        </Link>
      </nav>

      {/* Hero — full-viewport cinematic video statement */}
      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true">
          <video
            ref={heroVideoRef}
            className="hero-video"
            src="/hero-lecture.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div className="hero-scrim" />
        </div>

        <div className="hero-inner">
          <p className="hero-eyebrow">
            <span /> Frontier M&amp;A Academy
          </p>
          <h1>
            {hero.pre}<br />
            <em>{hero.em}</em>{hero.post}
          </h1>
          <p className="hero-description">{hero.desc}</p>
          <div className="hero-actions">
            <a className="button button-red on-dark" href="#exam">제1회 문제 풀기 <span>↗</span></a>
            <a className="button button-gold on-dark" href="#courses">5대 과정 보기 <span>↓</span></a>
          </div>
        </div>

        <div className="hero-bar">
          {/* 실적 수치는 회장 승인 전 노출 금지 — 구조(레벨·과정·방식)만 말한다 */}
          <div className="hero-proof">
            <div>
              <strong>5-LEVEL</strong>
              <span>L1–L5 승급 체계</span>
            </div>
            <div>
              <strong>5대 과정</strong>
              <span>실전 M&amp;A 커리큘럼</span>
            </div>
            <div>
              <strong>소수정예</strong>
              <span>OFFLINE DEAL LAB</span>
            </div>
          </div>
          <div className="hero-bar-aside">
            <button
              type="button"
              className="hero-videotoggle"
              data-playing={videoPlaying}
              onClick={toggleHeroVideo}
            >
              <i aria-hidden="true" />
              {videoPlaying ? "영상 정지" : "영상 재생"}
            </button>
            <a className="scroll-cue" href="#funnel" aria-label="아래로 스크롤">
              <span>SCROLL</span>
              <i aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* 문제은행 가로축 — 홈페이지와 같은 5분야 정본 */}
      <section className="section band-paper band-hair" id="courses">
        <span className="section-marker" aria-hidden="true">PROGRAMS</span>
        <div className="section-heading">
          <div>
            <p className="section-index">5개 분야 <i>Business Areas</i></p>
            <h2>다섯 개의 분야,<br /><em>{TOTAL_TOPICS}개의 주제</em></h2>
          </div>
          <p>
            문제은행은 두 축으로 짜여 있습니다. 세로축은 난이도 L1~L5, 가로축은 기업 홈페이지와 같은 5개 분야 {TOTAL_TOPICS}개 주제입니다. 한 문제는 &lsquo;경영권 분쟁 &gt; 델라웨어 판례 &gt; L5&rsquo;처럼 분류됩니다.
          </p>
        </div>

        {/* Track Selection Buttons */}
        <div className="track-grid" style={{ marginTop: "32px", marginBottom: "32px" }}>
          {tracks.map((t, idx) => (
            <button
              key={t.slug}
              className={`track-card ${selectedTrackIndex === idx ? "is-selected" : ""}`}
              onClick={() => {
                setSelectedTrackIndex(idx);
              }}
            >
              <span className="track-number">{t.number}</span>
              <strong>{t.title}</strong>
              <span className="track-hook">{t.en}</span>
              <p>{t.description}</p>
              <span className="track-meta">{t.topics.length}개 주제 <i>↗</i></span>
            </button>
          ))}
        </div>

        {/* 선택한 분야의 주제 목록 — 주제마다 L1~L5가 걸린다 */}
        <div className="bank-window">
          <div className="bank-head">
            <div>
              <span className="bank-eyebrow">문제은행 · QUESTION BANK</span>
              <h3>{currentTrack.title}</h3>
            </div>
            <p className="bank-axis">
              {currentTrack.topics.length}개 주제 × 5레벨 · 퀴즈 1건은 {QUESTIONS_PER_QUIZ}문제로 구성됩니다.
            </p>
          </div>

          {currentTrack.masterTip && (
            <div className="bank-mastertip">
              <span className="bank-tip-badge">MASTER TIP</span>
              <span>{currentTrack.masterTip}</span>
            </div>
          )}

          <ol className="bank-topics">
            {currentTrack.topics.map((topic, i) => (
              <li key={topic.label} className="bank-topic">
                <span className="bank-topic-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="bank-topic-title">{topic.label}</span>
                <span className="bank-topic-levels" aria-label="난이도 L1부터 L5까지">
                  {levelLadder.map((lv) => (
                    <i key={lv.code} data-free={lv.access === "무료회원"}>{lv.code}</i>
                  ))}
                </span>
              </li>
            ))}
          </ol>

          <p className="bank-note">
            {currentTrack.offlineOnly
              ? "본 분야의 설립·운영 세부와 가입 절차는 웹에 게재하지 않으며, 학습은 오프라인 과정에서 이어집니다."
              : "주제별 업무자료는 기업 홈페이지에서 공개하고, 문제 풀이와 해설은 이곳에서 진행합니다."}
            {" "}
            <Link href={`/company/business/${currentTrack.slug}`}>업무자료 보러 가기 ↗</Link>
          </p>
        </div>
      </section>

      {/* How you get in: online filters, offline delivers */}
      <section className="section band-white band-hair" id="funnel">
        <span className="section-marker" aria-hidden="true">ADMISSIONS</span>
        <div className="section-heading">
          <div>
            <p className="section-index">수강 여정 <i>Admissions</i></p>
            <h2>온라인은 관문이고,<br /><em>본체는 오프라인입니다</em></h2>
          </div>
          <p>
            온라인 과정은 실무를 가르치는 곳이 아니라, 오프라인에 앉을 사람을 가려내는 자리입니다. 선발 테스트를 통과한 인원만 성보경 회장이 직접 진행하는 소수정예 토론으로 넘어갑니다.
          </p>
        </div>

        <div className="funnel-rail">
          {funnelSteps.map((step) => (
            <div key={step.index} className="funnel-step" data-gate={String(step.gate)}>
              <span className="funnel-step-index">{step.index}{step.gate ? " · GATE" : ""}</span>
              <h3 className="funnel-name">{step.name}</h3>
              <p className="funnel-desc">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="matrix-scroll">
          <table className="matrix-table">
            <caption className="sr-only">단계별로 열리는 범위</caption>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: "left" }}>제공 범위 / 단계</th>
                {permissionMatrix.columns.map((col) => (
                  <th key={col} scope="col">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.cells.map((cell, i) => (
                    <td key={i}>
                      {cell === "O" ? (
                        <span className="matrix-yes">O</span>
                      ) : cell === "X" ? (
                        <span className="matrix-no">—</span>
                      ) : (
                        <span className="matrix-partial">{cell}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 회원 등급 · 포인트 — 가입 창구는 이곳 하나뿐이다 (보고서 4.3) */}
      <section className="section band-white band-hair" id="membership">
        <span className="section-marker" aria-hidden="true">MEMBERSHIP</span>
        <div className="section-heading">
          <div>
            <p className="section-index">회원 등급 <i>Membership</i></p>
            <h2>무료로 먼저 풀고,<br /><em>깊이는 유료로</em></h2>
          </div>
          <p>
            회원가입은 이곳에서만 받습니다. 무료회원은 기초 정보와 L1 입문 퀴즈를 풀 수 있고, 유료회원에게 L2~L5 전문가 퀴즈가 열립니다. 요금은 문의·가입 단계에서 개별 안내드립니다.
          </p>
        </div>

        <div className="member-grid">
          {memberTiers.map((tier) => (
            <div key={tier.key} className="member-card" data-tier={tier.key}>
              <span className="member-name">{tier.name}</span>
              <strong className="member-scope">{tier.scope}</strong>
              <p className="member-purpose">{tier.purpose}</p>
              <ul className="member-items">
                {tier.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}

          {/* 포인트 = 학습 보상 구조 */}
          <div className="member-card member-card--point">
            <span className="member-name">포인트 · 해설</span>
            <strong className="member-scope">문제를 풀어 쌓고, 해설을 열 때 씁니다</strong>
            <p className="member-purpose">
              풀이로 포인트를 적립하고 그 포인트로 문제별 성보경 회장 해설을 엽니다. 해설이 곧 보상이 되어 풀이를 반복하게 만듭니다.
            </p>
            <ul className="member-items">
              <li>적립 · 차감 비율은 운영 중 조정</li>
              <li>정답과 해설은 공개 영역에 노출되지 않음</li>
              <li>열람 화면은 복사 방지 · 워터마크 적용</li>
            </ul>
          </div>
        </div>

        <p className="member-cta-line">
          <a className="button button-red" href="#exam">먼저 문제 풀어보기 <span>↗</span></a>
          <span className="member-cta-note">가입 절차는 회원 시스템 구축 후 이 자리에서 바로 진행됩니다.</span>
        </p>
      </section>

      {/* 5-level promotion ladder — the academy's confirmed rank structure */}
      <section className="section band-paper band-hair" id="levels">
        <span className="section-marker" aria-hidden="true">LEVELS</span>
        <div className="section-heading">
          <div>
            <p className="section-index">5레벨 체계 <i>Level System</i></p>
            <h2>다섯 개의 레벨,<br /><em>통과해야 열립니다</em></h2>
          </div>
          <p>
            L1부터 L5까지 레벨별로 응시하고, 커트라인을 통과한 사람에게만 다음 레벨이 열립니다. 상급 문제는 성보경 회장의 검수 없이는 발행되지 않습니다.
          </p>
        </div>

        <div className="levels-grid">
          <ol className="levels-ladder">
            {levelLadder.map((lv, i) => (
              <li key={lv.code} className="levels-step" data-top={i >= 3}>
                <span className="levels-code">{lv.code}</span>
                <div className="levels-body">
                  <strong>
                    {lv.name}
                    <i className="levels-access" data-free={lv.access === "무료회원"}>{lv.access}</i>
                  </strong>
                  <span className="levels-scope">{lv.scope}</span>
                  <span className="levels-authoring">{lv.authoring}</span>
                </div>
                {i < levelLadder.length - 1 && <i className="levels-gate" aria-hidden="true">커트라인</i>}
              </li>
            ))}
          </ol>

          <div className="levels-rules">
            {levelRules.map((r) => (
              <div key={r.title} className="levels-rule">
                <strong>{r.title}</strong>
                <p>{r.desc}</p>
              </div>
            ))}
            <p className="levels-footnote">레벨 명칭과 커트라인은 확정 전의 안이며, 운영 중 조정될 수 있습니다.</p>
          </div>
        </div>
      </section>

      {/* The gate: online exists to filter for the offline programme */}
      <section className="section band-paper band-hair" id="exam">
        <span className="section-marker" aria-hidden="true">ASSESSMENT</span>
        <div className="section-heading">
          <div>
            <p className="section-index">선발 테스트 <i>Entrance Assessment</i></p>
            <h2>여기서 걸러집니다<br /><em>분야별 · L1~L5</em></h2>
          </div>
          <p>
성보경 회장이 40년간 쌓은 실전 사례에서 뽑아낸 문제입니다. 5개 분야마다 L1부터 L5까지 출제되며, 상급(L4)과 마스터(L5)는 회장 검수를 거친 문제만 발행됩니다.
          </p>
        </div>

        <div className="exam-grid">
          {weeklyExams.map((exam, idx) => (
            <button
              key={exam.no}
              type="button"
              className={`exam-card ${selectedExamIndex === idx ? "is-active" : ""}`}
              onClick={() => handleSelectExam(idx)}
              aria-pressed={selectedExamIndex === idx}
            >
              <span className="exam-track-label">{exam.trackLabel}</span>
              <div className="exam-tags">
                <span className="exam-tag">예시 문제 {exam.no}</span>
                <span className={`exam-tag ${exam.levelClass}`}>{exam.level}</span>
                <span className="exam-tag">{exam.type}</span>
              </div>
              <p className="exam-prompt">[문제] {exam.prompt}</p>
              <span className="exam-select-cue">
                {selectedExamIndex === idx ? "선택한 문제" : "문제 자세히 보기"}
                <i style={{ fontStyle: "normal" }}>{selectedExamIndex === idx ? "●" : "→"}</i>
              </span>
            </button>
          ))}
        </div>

        <p className="exam-notice">
          <strong>출제자 안내 —</strong> 정답은 공개되지 않습니다. 교과서에 적힌 내용을 옮겨 적은 답안이 아니라, 그 논리가 실전에서 무너지는 조건까지 짚어낸 답안을 평가합니다.
        </p>

        {/* Weekly assessment dossier — the chairman's framing for this round */}
        <aside className="verdict-container exam-dossier">
          <div className="verdict-eyebrow">금주의 평가 · Weekly Assessment</div>
          <h3 className="dossier-title">제1회 M&amp;A 실전 평가</h3>
          <div className="dossier-tags">
            <span className="tier-badge">출제: 주 3문제</span>
            <span className="tier-badge">정답 비공개 원칙</span>
            <span className="tier-badge">난이도: L1~L5</span>
          </div>
          <p className="dossier-quote">
            &ldquo;정답은 공개되지 않습니다. 교과서적 지식을 나열하는 답안보다, 실전에서 그 장점과 전략이 무너지는 한계 조건까지 사고한 답안이 높이 평가됩니다.&rdquo;
          </p>
          <div className="verdict-footer">
            <div className="verdict-author">
              <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>성보경 회장</span>
              <span style={{ fontSize: "13px", color: "var(--label-on-dark)" }}>㈜프론티어 M&amp;A 대표출제자</span>
            </div>
            <div className="stamp-seal">
              <span>成 保</span>
              <span>慶 印</span>
            </div>
          </div>
        </aside>
      </section>

      {/* Offline programme — the gate is online, the programme is here */}
      <section className="section band-ember" id="offline">
        <span className="section-marker" aria-hidden="true">OFFLINE</span>
        <div className="section-heading">
          <div>
            <p className="section-index section-index--onDark">오프라인 과정 <i>The Real Program</i></p>
            <h2 style={{ color: "#fff" }}>통과한 사람만<br /><em>이 방에 앉습니다</em></h2>
          </div>
          <p>
실무는 온라인에 올리지 않습니다. 선발 테스트를 통과한 인원만 성보경 회장이 직접 진행하는 토론식 정예 과정에 참여하며, 자산가와 자산관리자가 같은 자리에서 딜을 다룹니다.
          </p>
        </div>

        <div className="leveltest-grid">
          {/* Level Test Simulator */}
          <div style={{ background: "var(--ink)", padding: "36px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ font: "700 11px var(--font-label)", color: "var(--heritage-gold)" }}>ONLINE LEVEL TEST SIMULATION</span>
            <h3 style={{ font: "700 22px var(--font-serif)", margin: "16px 0", color: "#fff" }}>
              [서술형 평가] 정밀실사 미인지 우발채무 발생 시 협상 및 계약 구조화 방안
            </h3>
            <p style={{ fontSize: "14px", color: "var(--label-on-dark)", lineHeight: "1.7", marginBottom: "20px" }}>
              문제: 인수계약 체결 직후 50억 원 상당의 우발채무 위험이 포착되었습니다. 매도인과의 매매대금 조정 및 에스크로 설정 방안을 실전 조항 관점에서 서술하십시오.
            </p>

            <form onSubmit={handleRunLevelTest}>
              <textarea
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "14px",
                  background: "var(--ground)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  marginBottom: "16px"
                }}
                placeholder="답안 작성 예시: 매매대금의 20%를 에스크로 계좌에 2년간 예치하며, 손해배상 한도를 산정하여..."
                value={levelTestAnswer}
                onChange={(e) => setLevelTestAnswer(e.target.value)}
              />
              <button type="submit" className="button button-gold on-dark" style={{ width: "100%" }}>
                선발 테스트 채점받기 <span>→</span>
              </button>
            </form>

            {levelTestScore !== null && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "20px",
                  /* Amber, not red, for "needs work": red is now the brand colour
                     and would read as identity rather than a status. */
                  background: levelTestScore >= 80 ? "rgba(16, 185, 129, 0.15)" : "rgba(240, 180, 41, 0.16)",
                  border: `1px solid ${levelTestScore >= 80 ? "#10B981" : "#F0B429"}`
                }}
              >
                <div style={{ font: "700 18px var(--font-serif)", color: levelTestScore >= 80 ? "#34D399" : "#F5C451" }}>
                  심사 결과: {levelTestScore}점 / 100점({levelTestScore >= 80 ? "통과" : "보완 필요"})
                </div>
                <p style={{ fontSize: "13px", marginTop: "8px", color: "rgba(248,247,243,0.82)" }}>
                  {levelTestScore >= 80
                    ? "통과하셨습니다. 성보경 회장이 진행하는 오프라인 정예 과정에 지원하실 수 있습니다."
                    : "실전 리스크 조항 설정이 부족합니다. 온라인 과정에서 해당 대목을 보완한 뒤 다시 응시해 주십시오."}
                </p>
                {levelTestScore >= 80 && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="button button-red on-dark"
                    style={{ marginTop: "12px", width: "100%" }}
                  >
                    오프라인 과정 지원하기 <span>→</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* What the offline programme actually is */}
          <div style={{ background: "var(--ground)", padding: "36px", border: "1px solid var(--heritage-gold)" }}>
            <span style={{ font: "700 11px var(--font-label)", color: "var(--heritage-soft)" }}>OFFLINE PROGRAM</span>
            <h3 style={{ font: "700 26px var(--font-serif)", color: "#fff", margin: "16px 0" }}>
소수정예 토론 과정
            </h3>
            <p style={{ fontSize: "14.5px", color: "var(--label-on-dark)", lineHeight: "1.8", marginBottom: "24px" }}>
공개된 적 없는 40년치 실전 사례를 놓고 토론합니다. 강의가 아니라 실제 딜을 다루는 자리이므로, 참여 인원과 논의 내용은 외부에 공개되지 않습니다.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--label-on-dark)" }}>수강 자격 요건</span>
                <strong style={{ color: "var(--heritage-soft)" }}>선발 테스트 통과</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--label-on-dark)" }}>정원</span>
                <strong style={{ color: "#fff" }}>소수정예 · 심사 후 확정</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--label-on-dark)" }}>주관</span>
                <strong style={{ color: "#fff" }}>성보경 회장 직접 진행</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offline Registration Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(23, 17, 15, 0.85)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeItems: "center",
            zIndex: 100
          }}
        >
          <div
            style={{
              background: "var(--white)",
              maxWidth: "500px",
              width: "90%",
              padding: "36px",
              border: "2px solid var(--heritage-gold)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
            }}
          >
            <h3 style={{ font: "700 24px var(--font-serif)", color: "var(--ink-strong)", margin: "0 0 12px" }}>
              오프라인 정예 과정 지원
            </h3>
            <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "20px" }}>
              선발 테스트를 통과하셨습니다. 아래 정보를 남겨주시면 심사 후 개별 안내드립니다.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <input type="text" placeholder="성함(예: 홍길동)" style={{ padding: "12px", border: "1px solid var(--line-color)" }} />
              <input type="text" placeholder="소속 / 직함(예: XX자산운용 대표이사)" style={{ padding: "12px", border: "1px solid var(--line-color)" }} />
              <input type="email" placeholder="이메일 주소" style={{ padding: "12px", border: "1px solid var(--line-color)" }} />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  alert("오프라인 정예 과정 지원서가 제출되었습니다. 검토 후 안내 연락드리겠습니다.");
                  setShowModal(false);
                }}
                className="button button-red"
                style={{ flex: 1 }}
              >
                신청서 최종 제출 <span>→</span>
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="button button-gold"
                style={{ background: "var(--paper-deep)", color: "var(--ink)" }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand-col">
            {/* Dark background → white monochrome version (Frontier §07) */}
            <div className="brand-lockup is-inverse">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
              <img
                className="brand-symbol"
                src="/logo-frontier-group-white.svg"
                alt=""
                width={46}
                height={46}
                aria-hidden="true"
              />
              <span className="brand-wordmark">
                <span className="brand-name">FRONTIER GROUP</span>
                <span className="brand-descriptor">M&amp;A 아카데미</span>
              </span>
            </div>
            <p className="footer-statement">
              기업의 결합을 설계하고, 더 높은 가치를 세웁니다.<br className="br-wide" />
              대한민국 M&amp;A 1세대 성보경 회장의 40년 실전 자산에 기반한 AI 하이브리드 아카데미입니다.
            </p>
          </div>

          <nav className="footer-nav" aria-label="푸터 메뉴">
            <span className="footer-nav-title">과정 안내</span>
            <a href="#courses">5대 과정</a>
            <a href="#funnel">수강 여정</a>
            <a href="#levels">5레벨 체계</a>
            <a href="#exam">선발 테스트</a>
            <a href="#offline">오프라인 과정</a>
            <Link href="/">메인 게이트</Link>
          </nav>

          <address className="footer-contact">
            <span className="footer-nav-title">오시는 길 · 문의</span>
            {/* 기확보 정보(기획 보고서 3장)만 표기 — 상세 주소는 확인 후 추가 */}
            <p>
              서울 여의도<br />
              에이스아이테크시티
            </p>
            <a href="tel:+82220522100">02-2052-2100</a>
            <a href="mailto:sbk3000@frontier.kr">sbk3000@frontier.kr</a>
          </address>

          {/* TenAI signature — dark background version at ≥180px (TenAI §04·§08) */}
          <div className="partner-signature">
            <span className="partner-label">AI SYSTEM PARTNER</span>
            <a href="https://tenai.kr" target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
              <img
                className="partner-logo"
                src="/logo-tenai-dark.png"
                alt="TenAI · AX HUB PLATFORM"
                width={180}
                height={68}
              />
            </a>
            <p className="partner-note">
              플랫폼 설계와 운영을<br className="br-wide" />주식회사 텐에이아이가 맡고 있습니다.
            </p>
          </div>
        </div>

        <div className="footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A × 주식회사 텐에이아이. ALL RIGHTS RESERVED.</small>
          <div className="footer-base-right">
            <small>STRATEGIC UNION, ENDURING VALUE</small>
            {/* Entry point for the chairman; visitors have no use for it, so it
                sits here rather than in the main menu. */}
            <a
              className="footer-admin"
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
            >
              출제자 입장
              <i aria-hidden="true">↗</i>
              <span className="sr-only">(새 창에서 열림)</span>
            </a>
          </div>
        </div>
      </footer>

      {studio && (
        <StudioPanel
          heroVariant={heroVariant}
          onHeroVariant={setHeroVariant}
          onClose={closeStudio}
        />
      )}
    </main>
  );
}
