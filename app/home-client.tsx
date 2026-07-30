"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicQuestion } from "@/lib/questions";
import StudioPanel, { HERO_VARIANTS } from "./studio-panel";

// 5 Tracks Data from Master Plan
const tracks = [
  {
    id: 1,
    number: "01",
    title: "우호적 M&A",
    hook: "기업을 사고파는 정석",
    en: "FRIENDLY M&A TRACK",
    description: "M&A 전략 수립부터 밸류에이션, 정밀실사, 딜 구조화, 계약 협상, PMI까지 6대 핵심 업무를 다룹니다.",
    modules: 12,
    curriculum: {
      competencies: [
        "전략적 통찰력 및 산업 분석력",
        "고도화된 재무 구조화 및 자금조달 능력",
        "거래 진행 여부 결정 및 리스크 관리 능력",
        "최고위급 협상력 및 이해관계 조율 능력",
        "글로벌 오케스트라 지휘자로서의 리더십"
      ],
      knowledge: [
        "회계 및 재무 관리 기법",
        "관련 법규 및 규제 대응 기법",
        "세무 전략",
        "기업의 화학적 결합 및 PMI 기법"
      ],
      duties: [
        "M&A 전략 및 대상기업 발굴 (Sourcing)",
        "기업가치평가 및 재무적 모델링 (Valuation)",
        "정밀실사 바탕 인수위험 평가",
        "거래구조 설계 및 인수금융조달 (Structuring)",
        "거래조건 협상 및 계약서 작성",
        "인수 후 통합 작업 (PMI)"
      ]
    },
    chapters: [
      { id: "c1", title: "01. M&A 전략 및 대상기업 발굴", done: true },
      { id: "c2", title: "02. 기업가치평가 & DCF/WACC 모델링", done: true },
      { id: "c3", title: "03. 정밀실사 및 우발채무 계약 조항", done: false },
      { id: "c4", title: "04. 인수 후 통합(PMI) 및 조직 정렬", done: false },
    ],
    sampleClause: {
      title: "제12조 [진술과 보증 및 우발채무 보상]",
      code: `매도인은 이 계약 체결일 현재 대상회사의 재무제표에 반영되지 아니한 우발채무(조세, 손해배상청구, 미지급임금 등)가 존재하지 않음을 진술하고 보증한다. Closing 후 2년 이내에 발생한 정밀실사 미인지 우발채무에 대해서는 매매대금의 최대 20% 범위 내에서 매도인이 에스크로 계좌를 통해 즉시 보상한다.`
    },
    checklist: [
      "WACC 변동에 따른 DCF 민감도 분석 완료",
      "LOI 제출 전 바인딩/논바인딩 조항 구분 확인",
      "정밀실사 우발채무 발생 시 에스크로 보상비율 산정",
      "PMI 핵심 인력 이탈 방지를 위한 2년 Lock-up 조항"
    ]
  },
  {
    id: 2,
    number: "02",
    title: "적대적 M&A",
    hook: "원하지 않는 상대를 인수하는 법",
    en: "HOSTILE M&A TRACK",
    description: "스텔스 지분 매집과 의결권 확보, 포이즌필 무력화, 백기사 연대 분쇄까지 경영권 공격·방어 전술을 분석합니다.",
    modules: 14,
    curriculum: {
      competencies: [
        "대상기업 구조적 약점 파악 통찰력",
        "대담한 결단력",
        "우호 주주 포섭 협상력",
        "위기관리 능력",
        "정보 수집력"
      ],
      knowledge: [
        "자본시장법·상법·공정거래법에 대한 해부학적 이해",
        "기업가치평가 및 LBO 자금조달 기법",
        "경영권 방어 및 공격 전술 응용 전략"
      ],
      duties: [
        "적대적 M&A 네트워크 구축",
        "취약점 분석 및 대상기업 발굴",
        "인수자금 구조 설계 및 FI 유치",
        "스텔스 지분 매집 및 의결권 확보",
        "법적 소송 및 방어 대응"
      ]
    },
    chapters: [
      { id: "c1", title: "01. 대상기업 구조적 약점 및 지분 해부", done: true },
      { id: "c2", title: "02. 5% 룰 및 스텔스 지분 매집 메커니즘", done: false },
      { id: "c3", title: "03. 의결권 대리행사 권유 및 주주총회 분쟁", done: false },
      { id: "c4", title: "04. 방어 전술(백기사/황금주) 무력화 논리", done: false },
    ],
    sampleClause: {
      title: "제8조 [의결권 대리행사 및 주주약정]",
      code: `공동목적보유자 계약에 따라 특수관계인은 주주총회 의결권 행사 시 대주주의 서면 지시에 따라 통일된 의결권을 행사한다. 위반 시 보유 주식 전체에 대한 매도청구권(Call Option)이 발동된다.`
    },
    checklist: [
      "자본시장법 5% 보고 의무 시점 및 스텔스 구간 계산",
      "의결권 제한 주식 보유 현황 및 상법상 제한 요건 검토",
      "백기사 연대 파기 시 자금조달 구조(LBO) 리스크 체크",
      "공개매수(Tender Offer) 가격 산정 및 법적 제한 기준"
    ]
  },
  {
    id: 3,
    number: "03",
    title: "경영권 투자",
    hook: "지분으로 회사를 지배하는 구조",
    en: "CONTROL INVESTMENT TRACK",
    description: "딜 소싱부터 정밀실사, SPA 협상, Bolt-on 밸류업, 투자자금 회수(Exit)까지 5단계를 전담합니다.",
    modules: 10,
    curriculum: {
      competencies: [
        "투자 대상기업 발굴 및 네트워크 운영",
        "미래가치 설계 및 구조화 능력",
        "밸류업 및 경영권 통제 능력",
        "협상 및 갈등 조율 능력"
      ],
      knowledge: [
        "고도의 인수금융 및 기업가치평가 지식",
        "M&A 법률 및 제도적 규제 해결 능력"
      ],
      duties: [
        "1단계 — 딜 소싱 및 투자제안서 검토",
        "2단계 — 정밀 실사 (재무/법률/영업)",
        "3단계 — 매매계약 협상 및 인수 실행",
        "4단계 — 경영 통제 및 기업가치 제고",
        "5단계 — 투자자금 회수 (Exit)"
      ]
    },
    chapters: [
      { id: "c1", title: "01. PEF/VC 딜 소싱 및 투자제안서 검토", done: true },
      { id: "c2", title: "02. Locked-Box vs Closing Accounts 실사", done: false },
      { id: "c3", title: "03. Bolt-on 전략과 Anchor 기업 인수", done: false },
      { id: "c4", title: "04. Exit 회수구조(IPO / Trade Sale / Recap)", done: false },
    ],
    sampleClause: {
      title: "제15조 [동반매도청구권(Drag-along) 및 동반매수참여권(Tag-along)]",
      code: `대주주가 제3자에게 경영권 주식을 매각할 경우, 투자자는 동일한 조건으로 자신의 주식을 함께 매각할 권리(Tag-along)를 가진다. 투자자의 동의 없이 대주주가 단독 매각을 추진할 경우 Drag-along을 발동하여 대상 회사 지분 100%를 제3자에게 동시 매각할 수 있다.`
    },
    checklist: [
      "Locked-Box 가격조정 기전의 락드박스 일자 확정",
      "Drag-along 행사 시 최소 보장 수익률(IRR 15%) 명시",
      "Bolt-on 피인수기업과의 전산/영업망 통합 스케줄",
      "경영진 성과보상(Earn-out) 계약 조항 검토"
    ]
  },
  {
    id: 4,
    number: "04",
    title: "패밀리오피스",
    hook: "가문의 부를 3대까지 지키는 설계",
    en: "FAMILY OFFICE TRACK",
    description: "가문 헌장 제정과 승계 구조화, 가문위원회 운영, 자산 보호를 총괄하는 가문 CSO를 양성합니다.",
    modules: 11,
    curriculum: {
      competencies: [
        "가문 헌장(Family Constitution) 제정",
        "가문위원회 구성 및 권한 규정",
        "서비스 범위 확정",
        "설립비용·운영예산 및 보안시스템 구축"
      ],
      knowledge: [
        "신뢰성·전문성 갖춘 핵심 인력 채용",
        "세금 효율성·책임 분산 법인 형태 결정",
        "내부통제시스템(평판/사이버/투자) 구축",
        "택스 헤이븐 활용 및 글로벌 공동투자"
      ],
      duties: [
        "UHNW 가문 자산 관리 총괄",
        "가업 승계 구조 설계 및 실행",
        "세무·법률 리스크 통제",
        "가문 라이프스타일 및 평판 관리",
        "가문 최고비밀책임자(CSO) 역할 수행"
      ]
    },
    chapters: [
      { id: "c1", title: "01. 가문 헌장(Family Constitution) 제정", done: true },
      { id: "c2", title: "02. 승계 주식 신탁 및 지배구조 설계", done: false },
      { id: "c3", title: "03. Margin Loan을 활용한 경영권 유지", done: false },
      { id: "c4", title: "04. 가문 위험 관리 및 비공개 글로벌 투자", done: false },
    ],
    sampleClause: {
      title: "가문 헌장 제4조 [가문 자산 의결권 및 처분 제한]",
      code: `가문 소유 지주회사 주식의 매각은 가문위원회 재적 위원 4/5 이상의 찬성으로만 가능하며, 가문 외 제3자에게 지분을 양도할 경우 가문 신탁 재단이 우선매수권(Right of First Refusal)을 행사한다.`
    },
    checklist: [
      "가문 헌장 내 후계자 자격 기준 및 분쟁 조율 기전",
      "AUM 대비 운영 예산(0.5%~1.5%) 수립 및 보안 체계",
      "상속세 및 증여세법에 따른 지분 승계 트러스트 설계",
      "글로벌 공동투자(Co-investment) 네트워크 구축"
    ]
  },
  {
    id: 5,
    number: "05",
    title: "투자클럽 운영",
    hook: "돈과 딜이 모이는 폐쇄 네트워크",
    en: "INVESTOR CLUB TRACK",
    description: "Series LLC·VCC·SPC 역외 설계와 RWA 토큰화, ZKP 비밀선발, Alpha Inside 딜 소싱 네트워크를 구축합니다.",
    modules: 9,
    curriculum: {
      competencies: [
        "UHNW 자산관리 금융 네트워크 운영",
        "Series LLC / VCC / SPC 구조 설계",
        "주주약정서 작성 및 딜 소싱 채널 공유",
        "다국적 자산배분 및 RWA 토큰화"
      ],
      knowledge: [
        "Master-Feeder Structure 설계 원리",
        "ICSID 사법적 방어기전",
        "ZKP / SMPC 암호기술 활용"
      ],
      duties: [
        "안전한 법인구조 선택 및 클럽 설립",
        "합법적 역외 절세 루트 구축",
        "RWA 토큰화 및 결제 인프라 구축",
        "ZKP 암호기술 기반 회원 선발",
        "의사결정 투표시스템 운영",
        "Capital Call 송금 및 리스크 관리",
        "Alpha Inside 독점 정보 수집"
      ]
    },
    chapters: [
      { id: "c1", title: "01. Series LLC 및 SPC 역외 법인 구조화", done: true },
      { id: "c2", title: "02. Master-Feeder 구조와 역외 절세 래퍼", done: false },
      { id: "c3", title: "03. RWA 토큰화 및 ZKP 회원 검증", done: false },
      { id: "c4", title: "04. Capital Call 관리 및 ICSID 분쟁 방어", done: false },
    ],
    sampleClause: {
      title: "제21조 [Master-Feeder SPC 수직계열 조항]",
      code: `Feeder Fund는 운용 자금의 100%를 Cayman Master Fund에 투여하며, Master Fund가 개별 딜 SPC 주식을 취득함으로써 각 투자자의 법적 책임을 차단하고 다국적 조세조약 혜택을 도모한다.`
    },
    checklist: [
      "케이맨·싱가포르 VCC SPC 설립 및 법적 면책 요건",
      "Master-Feeder 구조에서의 Withholding Tax 차감 계산",
      "ZKP 영지식 증명을 통한 회원 암호화 선발 체계",
      "Capital Call 미이행 시 지분 몰수(Default) 조항"
    ]
  }
];


// 수강 여정 — 온라인은 선발 관문이고, 본체는 오프라인이다
const funnelSteps = [
  {
    index: "STEP 01",
    name: "무료 워밍업",
    desc: "공개 문제로 지금 수준을 가늠합니다. 가입 없이 바로 응시할 수 있습니다.",
    gate: false
  },
  {
    index: "STEP 02",
    name: "온라인 과정",
    desc: "5대 과정의 강의노트와 문제를 풀며 실전 개념을 쌓습니다.",
    gate: false
  },
  {
    index: "STEP 03",
    name: "선발 테스트",
    desc: "과정별 서술형 평가. 통과한 인원만 다음 단계로 넘어갑니다.",
    gate: true
  },
  {
    index: "STEP 04",
    name: "오프라인 정예 과정",
    desc: "성보경 회장이 직접 진행하는 소수정예 토론. 이 과정이 본체입니다.",
    gate: false
  }
];

// 단계별로 열리는 범위
const permissionMatrix = {
  columns: ["비회원", "무료 회원", "온라인 수강생", "선발 통과자"],
  rows: [
    { label: "과정 소개 열람", cells: ["O", "O", "O", "O"] },
    { label: "무료 워밍업 문제", cells: ["O", "O", "O", "O"] },
    { label: "강의노트 열람", cells: ["1장 샘플", "1장 전체", "전체 · 체크 저장", "전체 열람"] },
    { label: "과정별 문제 풀이", cells: ["X", "X", "O", "O"] },
    { label: "선발 테스트 응시", cells: ["X", "X", "O", "응시 완료"] },
    { label: "오프라인 정예 과정", cells: ["X", "X", "X", "O"] },
    { label: "투자클럽 · 딜 네트워크", cells: ["X", "X", "X", "심사 후 초대"] }
  ]
};

// Primary navigation — shared by the inline bar and the mobile drawer
// The five programmes are listed in the menu outright. They share one
// section, so each entry scrolls there and selects that programme.
const navItems = [
  ...tracks.map((t, i) => ({ href: "#courses", label: t.title, courseIndex: i })),
  { href: "#funnel", label: "수강 여정", courseIndex: -1 },
  { href: "#exam", label: "선발 테스트", courseIndex: -1 },
  { href: "#offline", label: "오프라인 과정", courseIndex: -1 }
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
      ".section-heading, .funnel-rail, .matrix-scroll, .exam-grid, .exam-notice, .exam-dossier, .verdict-container, .track-grid, .handbook-window, .leveltest-grid"
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

  // Web Handbook Interactive State
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({
    "0": true,
    "1": true,
    "2": false,
    "3": false
  });
  const [copiedToast, setCopiedToast] = useState(false);

  // Level Test State
  const [levelTestScore, setLevelTestScore] = useState<number | null>(null);
  const [levelTestAnswer, setLevelTestAnswer] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Copy Clause Handler
  const handleCopyClause = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  // Level Test Evaluation Simulator
  const handleRunLevelTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelTestAnswer.trim()) return;

    // Evaluate response depth
    const score = levelTestAnswer.length > 80 ? 88 : 72;
    setLevelTestScore(score);
  };

  return (
    <main>
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
          {navItems.map((item, idx) => (
            <a
              key={item.label}
              href={item.href}
              data-first-section={idx === tracks.length ? "true" : undefined}
              onClick={() => {
                if (item.courseIndex < 0) return;
                setSelectedTrackIndex(item.courseIndex);
                setSelectedChapterIndex(0);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
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
        {navItems.map((item, idx) => (
          <a
            key={item.label}
            href={item.href}
            data-first-section={idx === tracks.length ? "true" : undefined}
            onClick={() => {
              if (item.courseIndex >= 0) {
                setSelectedTrackIndex(item.courseIndex);
                setSelectedChapterIndex(0);
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
          <div className="hero-proof">
            <div>
              <strong>500회</strong>
              <span>TOTAL EXAMS · 1,500 QUESTIONS</span>
            </div>
            <div>
              <strong>3-TIER</strong>
              <span>STUDENT · AI · MASTER</span>
            </div>
            <div>
              <strong>1:10</strong>
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

      {/* The five programmes, named plainly and shown up front */}
      <section className="section band-paper band-hair" id="courses">
        <span className="section-marker" aria-hidden="true">PROGRAMS</span>
        <div className="section-heading">
          <div>
            <p className="section-index">5대 과정 <i>Programs</i></p>
            <h2>다섯 개의 과정,<br /><em>한국에 없던 실전</em></h2>
          </div>
          <p>차등의결권, TRS, 역외 구조처럼 국내 강의에서 다루지 않는 설계 기법을 실제 사례로 풉니다. 과정을 눌러 커리큘럼과 계약 조항 예시를 확인하십시오.</p>
        </div>

        {/* Track Selection Buttons */}
        <div className="track-grid" style={{ marginTop: "32px", marginBottom: "32px" }}>
          {tracks.map((t, idx) => (
            <button
              key={t.id}
              className={`track-card ${selectedTrackIndex === idx ? "is-selected" : ""}`}
              onClick={() => {
                setSelectedTrackIndex(idx);
                setSelectedChapterIndex(0);
              }}
            >
              <span className="track-number">{t.number}</span>
              <strong>{t.title}</strong>
              <span className="track-hook">{t.hook}</span>
              <p>{t.description}</p>
              <span className="track-meta">{t.modules}개 모듈 <i>↗</i></span>
            </button>
          ))}
        </div>

        {/* Interactive Handbook Reader Window */}
        <div className="handbook-window">
          <aside>
            <div className="handbook-logo">F</div>
            <b style={{ color: "var(--heritage-gold)", display: "block", marginBottom: "12px" }}>
              {currentTrack.title}
            </b>
            <nav>
              {currentTrack.chapters.map((chap, cIdx) => (
                <button
                  key={chap.id}
                  className={`handbook-nav-item ${selectedChapterIndex === cIdx ? "active" : ""}`}
                  onClick={() => setSelectedChapterIndex(cIdx)}
                >
                  {/* 스튜디오 문구 수정이 캐럿을 놓을 수 있도록 버튼 자체가 아니라
                      span이 텍스트를 든다 — 버튼은 편집 호스트가 되지 못한다. */}
                  <span>{chap.title} {chap.done ? "✓" : ""}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="handbook-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ font: "700 11px var(--font-label)", color: "var(--gold-ink)", letterSpacing: "0.1em" }}>
                CHAPTER {selectedChapterIndex + 1} HANDBOOK
              </span>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>회원 전용 · 체크리스트 연동</span>
            </div>

            <h3 style={{ font: "700 28px var(--font-serif)", color: "var(--ink-strong)", margin: "0 0 16px" }}>
              {currentTrack.chapters[selectedChapterIndex]?.title}
            </h3>

            <p style={{ fontSize: "14.5px", lineHeight: "1.8", color: "#4A3E38", maxWidth: "70ch" }}>
              본 핸드북 챕터에서는 실전 M&amp;A 거래 진행 시 반드시 점검해야 할 법률 조항과 핵심 체크리스트를 구조화하여 제공합니다.
            </p>

            {/* Track curriculum structure (기획서 §2.1) */}
            <div className="curriculum-grid">
              <div className="curriculum-col">
                <h5>핵심 역량 · {currentTrack.curriculum.competencies.length}</h5>
                <ul>
                  {currentTrack.curriculum.competencies.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
              <div className="curriculum-col">
                <h5>기본 지식 · {currentTrack.curriculum.knowledge.length}</h5>
                <ul>
                  {currentTrack.curriculum.knowledge.map((k) => <li key={k}>{k}</li>)}
                </ul>
              </div>
              <div className="curriculum-col">
                <h5>핵심 업무 · {currentTrack.curriculum.duties.length}</h5>
                <ul>
                  {currentTrack.curriculum.duties.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </div>
            </div>

            {/* Interactive Checklist */}
            <div style={{ margin: "24px 0" }}>
              <h4 style={{ font: "700 15px var(--font-serif)", color: "var(--ink-strong)", marginBottom: "12px" }}>
                실무 체크리스트 (클릭하여 완료 상태 저장)
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {currentTrack.checklist.map((item, idx) => {
                  const key = `${selectedChapterIndex}-${idx}`;
                  const isChecked = !!checklistState[key];
                  return (
                    <button
                      key={idx}
                      onClick={() => setChecklistState(prev => ({ ...prev, [key]: !prev[key] }))}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 16px",
                        background: isChecked ? "var(--paper-deep)" : "var(--paper-bg)",
                        border: "1px solid var(--line-color)",
                        textAlign: "left",
                        fontSize: "13.5px"
                      }}
                    >
                      <span
                        style={{
                          width: "18px",
                          height: "18px",
                          border: "1px solid var(--ink-strong)",
                          background: isChecked ? "var(--ink-strong)" : "transparent",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "11px",
                          fontWeight: 700
                        }}
                      >
                        {isChecked ? "✓" : ""}
                      </span>
                      <span style={{ textDecoration: isChecked ? "line-through" : "none", color: isChecked ? "var(--muted)" : "inherit" }}>
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contract Clause Code Block */}
            <div className="clause-block">
              <div className="clause-header">
                <span className="clause-title">{currentTrack.sampleClause.title}</span>
                <button
                  className="copy-btn"
                  onClick={() => handleCopyClause(currentTrack.sampleClause.code)}
                >
                  {copiedToast ? "복사 완료" : "조항 복사"}
                </button>
              </div>
              <div className="clause-code">{currentTrack.sampleClause.code}</div>
            </div>
          </div>
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

      {/* The gate: online exists to filter for the offline programme */}
      <section className="section band-paper band-hair" id="exam">
        <span className="section-marker" aria-hidden="true">ASSESSMENT</span>
        <div className="section-heading">
          <div>
            <p className="section-index">선발 테스트 <i>Entrance Assessment</i></p>
            <h2>여기서 걸러집니다<br /><em>과정별 · 초·중·상급</em></h2>
          </div>
          <p>
성보경 회장이 40년간 쌓은 실전 사례에서 뽑아낸 문제입니다. 과정별로 초·중·상급이 출제되며, 여기서 통과한 인원만 오프라인 정예 과정으로 넘어갑니다.
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
            <span className="tier-badge">전체 회차: 500회</span>
            <span className="tier-badge">난이도: 초·중·상급</span>
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
            <a href="#exam">선발 테스트</a>
            <a href="#offline">오프라인 과정</a>
          </nav>

          <address className="footer-contact">
            <span className="footer-nav-title">오시는 길 · 문의</span>
            <p>
              서울시 영등포구 경인로 775<br />
              에이스아이테크시티 1동 9층
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
