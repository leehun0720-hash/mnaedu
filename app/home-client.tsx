"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicQuestion, QuestionAnswer } from "@/lib/questions";
import { CONTACT, HERO, SERVICES, TRUST, QUIZ, CHAIRMAN, INQUIRY } from "@/lib/content";
import MemberGate from "./member-gate";

const NAV = [
  { href: "#services", label: "업무 영역" },
  { href: "#trust", label: "신뢰의 근거" },
  { href: "#practice", label: "실무 문제" },
  { href: "#chairman", label: "회장" },
  { href: "#contact", label: "문의" },
];

export default function Home({
  questions,
  memberName: initialMemberName,
}: {
  questions: PublicQuestion[];
  memberName: string | null;
}) {
  const [memberName, setMemberName] = useState(initialMemberName);
  const [gate, setGate] = useState<{ open: boolean; mode: "signup" | "login" }>({
    open: false,
    mode: "signup",
  });
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({});
  const [pending, setPending] = useState<number | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const pendingReveal = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Track the element's own events rather than assuming the click succeeded —
  // autoplay policies and the browser can pause it without telling us.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => setVideoPlaying(!video.paused);
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    sync();
    return () => {
      video.removeEventListener("play", sync);
      video.removeEventListener("pause", sync);
    };
  }, []);

  function toggleVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }

  // The header inverts over the hero video and goes solid once past it
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function revealAnswer(id: number) {
    if (answers[id] || pending !== null) return;
    if (!memberName) {
      // Remember which question they wanted, so signing in lands them back on it
      pendingReveal.current = id;
      setGate({ open: true, mode: "signup" });
      return;
    }
    setPending(id);
    setAnswerError(null);
    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      const data = (await res.json()) as {
        answers?: QuestionAnswer[];
        error?: string;
        needsMember?: boolean;
      };
      if (data.needsMember) {
        // The session expired between page load and this click
        setMemberName(null);
        pendingReveal.current = id;
        setGate({ open: true, mode: "login" });
        return;
      }
      if (!res.ok || !data.answers?.length) {
        setAnswerError(data.error ?? "해설을 불러오지 못했습니다.");
        return;
      }
      setAnswers((prev) => ({ ...prev, [id]: data.answers![0] }));
    } catch {
      setAnswerError("연결에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(null);
    }
  }

  function onSignedIn(name: string) {
    setMemberName(name);
    setGate({ open: false, mode: "signup" });
    const wanted = pendingReveal.current;
    pendingReveal.current = null;
    if (wanted !== null) {
      // The state update above has not landed yet, so fetch directly
      void (async () => {
        setPending(wanted);
        try {
          const res = await fetch("/api/answers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [wanted] }),
          });
          const data = (await res.json()) as { answers?: QuestionAnswer[] };
          if (data.answers?.length) {
            setAnswers((prev) => ({ ...prev, [wanted]: data.answers![0] }));
          }
        } catch {
          setAnswerError("해설을 불러오지 못했습니다. 다시 시도해 주세요.");
        } finally {
          setPending(null);
        }
      })();
    }
  }

  async function signOut() {
    await fetch("/api/member/logout", { method: "POST" });
    setMemberName(null);
    setAnswers({});
  }

  return (
    <>
      <header className="site-header" data-scrolled={scrolled}>
        <div className="header-inner">
          <a className="brand" href="#top">
            <img src="/logo-frontier-group.svg" alt="" className="brand-mark" aria-hidden="true" />
            <span className="brand-text">
              <strong>FRONTIER M&amp;A</strong>
              <em>주식회사 프론티어 엠앤에이</em>
            </span>
          </a>

          <nav className="primary-nav" aria-label="주요 메뉴">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            {memberName ? (
              <>
                <span className="header-member">{memberName} 님</span>
                <button className="header-login" onClick={signOut}>
                  로그아웃
                </button>
              </>
            ) : (
              <button
                className="header-login"
                onClick={() => setGate({ open: true, mode: "login" })}
              >
                회원 로그인
              </button>
            )}
            <button
              className="nav-toggle"
              aria-expanded={navOpen}
              aria-controls="mobile-nav"
              onClick={() => setNavOpen((v) => !v)}
            >
              <span className="sr-only">메뉴</span>
              <span className="nav-toggle-bars" data-open={navOpen}>
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>

        <div className="mobile-nav" id="mobile-nav" data-open={navOpen}>
          {NAV.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setNavOpen(false)}>
              {item.label}
            </a>
          ))}
          <a className="mobile-nav-cta" href="#contact" onClick={() => setNavOpen(false)}>
            {HERO.ctaPrimary}
          </a>
        </div>
      </header>

      <main id="top">
        {/* ── HERO ── */}
        <section className="hero">
          <video
            ref={videoRef}
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            poster="/og.png"
            aria-hidden="true"
          >
            <source src="/hero-lecture.mp4" type="video/mp4" />
          </video>
          <div className="hero-scrim" />

          <button className="hero-videotoggle" onClick={toggleVideo}>
            {videoPlaying ? "❚❚ 영상 정지" : "▶ 영상 재생"}
          </button>

          <div className="hero-inner">
            <p className="hero-eyebrow">{HERO.eyebrow}</p>
            <h1 className="hero-title">
              {HERO.headline.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <p className="hero-sub">{HERO.sub}</p>

            <div className="hero-cta">
              <a className="btn btn-primary" href="#contact">
                {HERO.ctaPrimary}
              </a>
              <a className="btn btn-ghost" href="#services">
                {HERO.ctaSecondary}
              </a>
            </div>

            <dl className="hero-stats">
              {HERO.stats.map((s) => (
                <div key={s.label}>
                  <dt>{s.value}</dt>
                  <dd>{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── 업무 영역 ── */}
        <section className="section" id="services">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">PRACTICE AREAS</p>
              <h2>업무 영역</h2>
              <p className="section-lead">{SERVICES.intro}</p>
            </header>

            <div className="service-grid">
              {SERVICES.items.map((item) => (
                <article
                  key={item.no}
                  className={`service-card${item.closed ? " is-closed" : ""}`}
                >
                  <p className="service-no">{item.no}</p>
                  <h3>{item.title}</h3>
                  <p className="service-tagline">{item.tagline}</p>
                  <p className="service-body">{item.body}</p>
                  {item.deliverables.length > 0 && (
                    <ul className="service-list">
                      {item.deliverables.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                  {item.closed && <p className="service-closed-tag">초대 · 심사</p>}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── 신뢰의 근거 ── */}
        <section className="section section-dark" id="trust">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">WHY US</p>
              <h2>신뢰의 근거</h2>
              <p className="section-lead">{TRUST.intro}</p>
            </header>

            <div className="pillar-grid">
              {TRUST.pillars.map((p, i) => (
                <article key={p.title} className="pillar">
                  <span className="pillar-index" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                  <p className="pillar-proof">{p.proof}</p>
                </article>
              ))}
            </div>

            <div className="whitebook">
              <div className="whitebook-text">
                <h3>{TRUST.whitebook.title}</h3>
                <p>{TRUST.whitebook.body}</p>
              </div>
              <ul className="whitebook-points">
                {TRUST.whitebook.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 실무 문제 ── */}
        <section className="section" id="practice">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">{QUIZ.eyebrow}</p>
              <h2>{QUIZ.title}</h2>
              <p className="section-lead">{QUIZ.intro}</p>
            </header>

            <ol className="how-list">
              {QUIZ.howItWorks.map((s) => (
                <li key={s.step}>
                  <span className="how-step">{s.step}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>

            <div className="question-list">
              {questions.map((q) => {
                const revealed = answers[q.id];
                const isPending = pending === q.id;
                return (
                  <article key={q.id} className="question" data-open={Boolean(revealed)}>
                    <div className="question-meta">
                      <span className="question-no">문제 {String(q.no).padStart(2, "0")}</span>
                      <span className="question-track">{q.trackLabel}</span>
                      <span className="question-type">{q.type}</span>
                    </div>

                    <p className="question-prompt">{q.prompt}</p>

                    {q.choices && q.choices.length > 0 && (
                      <ul className="choice-list">
                        {q.choices.map((choice, index) => (
                          <li key={choice}>
                            <button
                              type="button"
                              className="choice"
                              data-picked={picked[q.id] === index}
                              onClick={() =>
                                setPicked((prev) => ({ ...prev, [q.id]: index }))
                              }
                            >
                              <span className="choice-mark">{"①②③④⑤"[index] ?? index + 1}</span>
                              <span>{choice}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {revealed ? (
                      <div className="answer">
                        <h4>정답 · 모범답안</h4>
                        <p>{revealed.answer}</p>
                        {revealed.explanation && (
                          <>
                            <h4>해설 — 실무에서 갈리는 지점</h4>
                            <p>{revealed.explanation}</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="answer-locked">
                        <p className="locked-label">
                          <span className="lock" aria-hidden="true">
                            🔒
                          </span>
                          {QUIZ.lockedLabel}
                        </p>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => revealAnswer(q.id)}
                          disabled={isPending}
                        >
                          {isPending
                            ? "여는 중…"
                            : memberName
                              ? "정답과 해설 보기"
                              : QUIZ.unlockCta}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {answerError && (
              <p className="answer-error" role="alert">
                {answerError}
              </p>
            )}

            {!memberName && (
              <aside className="member-pitch">
                <div>
                  <h3>{QUIZ.memberPitch.title}</h3>
                  <p>{QUIZ.memberPitch.body}</p>
                  <p className="member-note">{QUIZ.memberPitch.note}</p>
                </div>
                <div className="member-pitch-side">
                  <ul>
                    {QUIZ.memberPitch.benefits.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <button
                    className="btn btn-primary"
                    onClick={() => setGate({ open: true, mode: "signup" })}
                  >
                    {QUIZ.unlockCta}
                  </button>
                </div>
              </aside>
            )}
          </div>
        </section>

        {/* ── 회장 ── */}
        <section className="section section-dark" id="chairman">
          <div className="wrap chairman-wrap">
            <div className="chairman-side">
              <p className="eyebrow">{CHAIRMAN.eyebrow}</p>
              <h2 className="chairman-name">
                {CHAIRMAN.name}
                <span className="chairman-hanja">{CHAIRMAN.hanja}</span>
              </h2>
              <p className="chairman-role">{CHAIRMAN.role}</p>
              <blockquote className="chairman-quote">{CHAIRMAN.quote}</blockquote>
            </div>

            <div className="chairman-body">
              <p className="chairman-lead">{CHAIRMAN.lead}</p>
              {CHAIRMAN.paragraphs.map((p) => (
                <p key={p.slice(0, 20)}>{p}</p>
              ))}
              <p className="chairman-column">{CHAIRMAN.columnNote}</p>
            </div>
          </div>
        </section>

        {/* ── 절차 · Q&A · 문의 ── */}
        <section className="section" id="contact">
          <div className="wrap">
            <header className="section-head">
              <p className="eyebrow">HOW WE WORK</p>
              <h2>의뢰 절차</h2>
              <p className="section-lead">{INQUIRY.process.intro}</p>
            </header>

            <ol className="process-list">
              {INQUIRY.process.steps.map((s) => (
                <li key={s.no}>
                  <span className="process-no">{s.no}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>

            <div className="faq">
              <h3 className="faq-title">자주 묻는 질문</h3>
              {INQUIRY.faq.map((item, i) => (
                <div key={item.q} className="faq-item" data-open={openFaq === i}>
                  <button
                    className="faq-q"
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-icon" aria-hidden="true" />
                  </button>
                  {openFaq === i && <p className="faq-a">{item.a}</p>}
                </div>
              ))}
            </div>

            <div className="contact-cta">
              <h3>{INQUIRY.cta.title}</h3>
              <p>{INQUIRY.cta.body}</p>
              <div className="contact-lines">
                <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                <span>{CONTACT.address}</span>
              </div>
              <a className="btn btn-primary" href={`mailto:${CONTACT.email}`}>
                {INQUIRY.cta.button}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <div className="footer-brand">
            <img
              src="/logo-frontier-group-white.svg"
              alt="FRONTIER M&A"
              className="footer-mark"
            />
            <p>주식회사 프론티어 엠앤에이</p>
          </div>
          <div className="footer-contact">
            <p>{CONTACT.address}</p>
            <p>
              <a href={CONTACT.phoneHref}>{CONTACT.phone}</a> ·{" "}
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </p>
          </div>
          <p className="footer-copy">
            © {new Date().getFullYear()} FRONTIER M&amp;A. Platform by TEN AI.
          </p>
        </div>
      </footer>

      <MemberGate
        key={gate.open ? gate.mode : "closed"}
        open={gate.open}
        mode={gate.mode}
        onClose={() => setGate((g) => ({ ...g, open: false }))}
        onSignedIn={onSignedIn}
      />
    </>
  );
}
