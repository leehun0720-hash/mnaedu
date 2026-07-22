"use client";

import { useState } from "react";

const tracks = [
  {
    number: "01",
    title: "우호적 M&A",
    en: "FRIENDLY M&A",
    description: "거래 구조 설계부터 실사, 협상과 PMI까지 우호적 인수합병의 전 과정을 익힙니다.",
    modules: 12,
    progress: 68,
  },
  {
    number: "02",
    title: "적대적 M&A",
    en: "HOSTILE M&A",
    description: "공격과 방어의 논리, 지분 전략과 의사결정 구조를 실제 사례 중심으로 분석합니다.",
    modules: 14,
    progress: 24,
  },
  {
    number: "03",
    title: "경영권 투자",
    en: "CONTROL INVESTMENT",
    description: "기업가치와 지배구조를 함께 읽고 경영권 투자의 기회와 리스크를 판단합니다.",
    modules: 10,
    progress: 0,
  },
  {
    number: "04",
    title: "패밀리 오피스",
    en: "FAMILY OFFICE",
    description: "가문의 자산·기업·승계를 장기 관점에서 통합 설계하는 핵심 체계를 배웁니다.",
    modules: 11,
    progress: 0,
  },
  {
    number: "05",
    title: "투자가 클럽 운영",
    en: "INVESTOR CLUB",
    description: "신뢰 기반 투자 네트워크의 구성, 딜 소싱과 공동투자 운영 원칙을 정립합니다.",
    modules: 9,
    progress: 0,
  },
];

const quizOptions = [
  "재무제표 계정과목 통일",
  "통합 비전과 의사결정 거버넌스 정렬",
  "전 임직원 직급 체계 변경",
  "피인수기업 브랜드 즉시 폐기",
];

export default function Home() {
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [checklist, setChecklist] = useState([true, true, false, false]);
  const currentTrack = tracks[selectedTrack];

  const toggleChecklist = (index: number) => {
    setChecklist((items) => items.map((item, itemIndex) => itemIndex === index ? !item : item));
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="M&A Mastery 홈">
          <span className="frontier-word">FRONTIER <b>M&amp;A</b></span>
          <span className="brand-divider">×</span>
          <span className="ten-word"><i>10</i> TEN AI</span>
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#tracks">전문과정</a>
          <a href="#journey">학습방식</a>
          <a href="#handbook">웹 핸드북</a>
          <a href="#admission">오프라인 과정</a>
        </nav>
        <a className="header-login" href="#demo">내 강의실 <span>↗</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><span /> FRONTIER M&amp;A × TEN AI PROFESSIONAL ACADEMY</p>
            <h1>거래를 아는 사람에서<br /><em>판을 설계하는 전문가</em>로.</h1>
            <p className="hero-description">
              대한민국 M&amp;A 1세대의 실전 지식과 TEN AI의 학습 기술을 결합한<br className="desktop-only" />
              국내 최초 M&amp;A·경영권 투자·패밀리 오피스 전문가 과정.
            </p>
            <div className="hero-actions">
              <a className="button button-gold" href="#demo">무료 워밍업 시작 <span>↗</span></a>
              <a className="text-link" href="#tracks">5개 전문과정 보기 <span>↓</span></a>
            </div>
            <div className="hero-proof">
              <div><strong>30+</strong><span>YEARS<br />FIELD EXPERIENCE</span></div>
              <div><strong>5</strong><span>PREMIUM<br />TRACKS</span></div>
              <div><strong>1:10</strong><span>OFFLINE<br />INTENSIVE</span></div>
            </div>
          </div>

          <div className="academy-preview" id="demo">
            <div className="preview-topbar">
              <span className="preview-brand">MY ACADEMY</span>
              <span className="member-chip"><i /> 유료 회원</span>
            </div>
            <div className="preview-heading">
              <div>
                <span>{currentTrack.en}</span>
                <h2>{currentTrack.title} 전문가 과정</h2>
              </div>
              <b>{String(currentTrack.progress).padStart(2, "0")}%</b>
            </div>
            <div className="progress"><i style={{ width: `${currentTrack.progress}%` }} /></div>
            <div className="lesson-list">
              <div className="lesson lesson-complete"><span>01</span><div><b>거래 구조와 이해관계자</b><small>CHAPTER COMPLETE</small></div><i>✓</i></div>
              <div className="lesson lesson-active"><span>02</span><div><b>기업가치와 실사</b><small>학습 중 · 24분 남음</small></div><i>▶</i></div>
              <div className="lesson"><span>03</span><div><b>협상 설계와 계약</b><small>다음 챕터</small></div><i>—</i></div>
            </div>
            <div className="checkpoint">
              <div className="checkpoint-mark">L2</div>
              <div><span>LEVEL CHECKPOINT</span><b>다음 레벨 테스트까지 2개 챕터</b></div>
              <span>→</span>
            </div>
          </div>
        </div>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
      </section>

      <section className="credibility-strip" aria-label="협력 특징">
        <div><span>01</span><p><b>FIELD KNOWLEDGE</b>대한민국 M&amp;A 1세대의 실전 콘텐츠</p></div>
        <div><span>02</span><p><b>LEARNING TECHNOLOGY</b>TEN AI 기반 구조화 학습 경험</p></div>
        <div><span>03</span><p><b>SELECTIVE ADMISSION</b>검증된 인원만 오프라인 심화과정으로</p></div>
      </section>

      <section className="section tracks-section" id="tracks">
        <div className="section-heading">
          <div><p className="section-index">01 — PROFESSIONAL TRACKS</p><h2>당신의 전문영역을<br /><em>선택하십시오.</em></h2></div>
          <p>대중적인 자격증 과정이 아닙니다. 실제 딜과 의사결정을 다루는 다섯 개의 전문 트랙에서 자신의 경쟁력을 설계합니다.</p>
        </div>
        <div className="track-grid">
          {tracks.map((track, index) => (
            <button
              className={`track-card ${selectedTrack === index ? "is-selected" : ""}`}
              key={track.title}
              onClick={() => setSelectedTrack(index)}
              aria-pressed={selectedTrack === index}
            >
              <span className="track-number">{track.number}</span>
              <span className="track-en">{track.en}</span>
              <strong>{track.title}</strong>
              <p>{track.description}</p>
              <span className="track-meta">{track.modules} MODULES <i>↗</i></span>
            </button>
          ))}
        </div>
        <p className="selection-note">현재 선택: <b>{currentTrack.title} 전문가 과정</b> — 상단 내 강의실 미리보기에 반영되었습니다.</p>
      </section>

      <section className="journey-section" id="journey">
        <div className="section journey-inner">
          <div className="journey-intro">
            <p className="section-index light">02 — THE MASTERY PATH</p>
            <h2>배우고, 검증하고,<br /><em>선발됩니다.</em></h2>
            <p>온라인에서 기반을 다지고 실력으로 증명한 사람만이 소수정예 오프라인 과정에 진입합니다.</p>
          </div>
          <div className="journey-steps">
            <article><span>01 / OPEN</span><b>무료 워밍업</b><p>핵심 개념 문제로 현재 수준과 과정 적합도를 확인합니다.</p><i>START</i></article>
            <article><span>02 / MEMBER</span><b>온라인 정규과정</b><p>웹 핸드북, 해설 영상, 실전 문제를 자신만의 속도로 학습합니다.</p><i>LEARN</i></article>
            <article><span>03 / TEST</span><b>레벨 테스트</b><p>트랙별 기준 점수를 통과해 지식과 판단 역량을 검증합니다.</p><i>PROVE</i></article>
            <article className="journey-premium"><span>04 / INVITATION</span><b>오프라인 심화</b><p>1:1~10:1 정예 세션에서 실제 사례와 협상 전략을 다룹니다.</p><i>MASTER</i></article>
          </div>
        </div>
      </section>

      <section className="section experience-section" id="handbook">
        <div className="experience-copy">
          <p className="section-index">03 — LIVING HANDBOOK</p>
          <h2>읽고 끝나는 교재가 아닌,<br /><em>결정에 쓰이는 도구.</em></h2>
          <p className="experience-lead">모든 강의노트는 검색 가능한 웹 핸드북으로 제공됩니다. 체크리스트, 계약 조항, 실무 템플릿을 바로 확인하고 학습 이력을 축적합니다.</p>
          <ul>
            <li><span>01</span>트랙·챕터별 구조화된 강의노트</li>
            <li><span>02</span>복사해 활용하는 실무 템플릿</li>
            <li><span>03</span>즉시 해설과 개인 오답노트</li>
          </ul>
        </div>
        <div className="handbook-window">
          <aside>
            <div className="handbook-logo">F<span>M&amp;A</span></div>
            <b>우호적 M&amp;A</b>
            <nav aria-label="핸드북 목차">
              <span className="done">01 거래의 시작 <i>✓</i></span>
              <span className="active">02 실사와 가치평가</span>
              <span>03 협상과 계약</span>
              <span>04 PMI</span>
            </nav>
          </aside>
          <div className="handbook-content">
            <div className="handbook-toolbar"><span>CHAPTER 02</span><span>⌕ 검색</span></div>
            <h3>실사 착수 전<br />핵심 체크리스트</h3>
            <p>대상 기업의 가치와 잠재 리스크를 균형 있게 파악하기 위한 사전 점검 항목입니다.</p>
            <div className="checklist">
              {["거래 목적과 핵심 가설 정의", "실사 범위와 우선순위 합의", "핵심 인력 유지 리스크 검토", "PMI 의사결정 체계 초안"].map((item, index) => (
                <button key={item} onClick={() => toggleChecklist(index)} aria-pressed={checklist[index]}>
                  <i className={checklist[index] ? "checked" : ""}>{checklist[index] ? "✓" : ""}</i>
                  <span>{item}</span>
                </button>
              ))}
            </div>
            <small>자동 저장됨 · {checklist.filter(Boolean).length}/4 완료</small>
          </div>
        </div>
      </section>

      <section className="quiz-section" id="admission">
        <div className="section quiz-inner">
          <div className="quiz-copy">
            <p className="section-index">04 — WARM-UP QUESTION</p>
            <span className="quiz-category">M&amp;A INTEGRATION · BASIC</span>
            <h2>인수 후 통합(PMI)을 시작할 때<br />가장 먼저 정렬해야 하는 것은?</h2>
            <div className="quiz-options">
              {quizOptions.map((option, index) => (
                <button
                  key={option}
                  onClick={() => setQuizAnswer(index)}
                  className={quizAnswer === index ? (index === 1 ? "correct" : "wrong") : ""}
                >
                  <span>{String.fromCharCode(65 + index)}</span>{option}
                  {quizAnswer === index && <i>{index === 1 ? "✓" : "×"}</i>}
                </button>
              ))}
            </div>
            {quizAnswer !== null && (
              <div className={`quiz-feedback ${quizAnswer === 1 ? "success" : "retry"}`}>
                <b>{quizAnswer === 1 ? "정답입니다." : "다시 생각해 보세요."}</b>
                <p>PMI의 출발점은 두 조직이 공유할 통합 비전과 의사결정 거버넌스를 명확히 정렬하는 것입니다.</p>
              </div>
            )}
          </div>
          <aside className="admission-card">
            <span>OFFLINE INTENSIVE</span>
            <h3>실력으로 증명한<br />사람만 초대합니다.</h3>
            <p>온라인 레벨 테스트 통과자에게만 오프라인 심화과정 신청 자격이 주어집니다.</p>
            <div><b>다음 코호트</b><strong>2026. 09</strong></div>
            <div><b>정원</b><strong>최대 10명</strong></div>
            <div><b>형태</b><strong>사례·협상 집중</strong></div>
            <a href="#top">입학 절차 확인 <span>↗</span></a>
          </aside>
        </div>
      </section>

      <section className="vision-section">
        <div className="vision-mark">F × 10</div>
        <blockquote>“M&amp;A를 아는 사람은 많습니다.<br /><em>성공하는 거래를 설계할 사람은 드뭅니다.</em>”</blockquote>
        <p>FRONTIER M&amp;A의 경험 × TEN AI의 학습 기술</p>
      </section>

      <section className="final-cta">
        <div>
          <p className="section-index light">BEGIN YOUR MASTERY</p>
          <h2>기업의 결정적 순간을<br />이끄는 사람이 되십시오.</h2>
        </div>
        <div>
          <p>첫 번째 워밍업은 무료입니다.<br />지금 당신의 M&amp;A 판단력을 확인해 보세요.</p>
          <a className="button button-gold" href="#demo">무료 진단 시작 <span>↗</span></a>
        </div>
      </section>

      <footer>
        <div className="brand-lockup footer-brand"><span className="frontier-word">FRONTIER <b>M&amp;A</b></span><span className="brand-divider">×</span><span className="ten-word"><i>10</i> TEN AI</span></div>
        <p>국내 최초 M&amp;A·경영권 투자·패밀리 오피스 전문가 양성 플랫폼</p>
        <nav><a href="#tracks">전문과정</a><a href="#journey">학습방식</a><a href="#handbook">핸드북</a><a href="#top">문의</a></nav>
        <small>© 2026 FRONTIER M&amp;A × TEN AI. ALL RIGHTS RESERVED.</small>
      </footer>
    </main>
  );
}
