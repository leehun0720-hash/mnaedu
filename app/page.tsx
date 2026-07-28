"use client";

import { useEffect, useRef, useState } from "react";

// 5 Tracks Data from Master Plan
const tracks = [
  {
    id: 1,
    number: "01",
    title: "우호적 M&A 전문가 과정",
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
    title: "적대적 M&A 전문가 과정",
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
    title: "경영권투자 전문가 과정",
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
    title: "패밀리오피스 전문가 과정",
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
    title: "투자가클럽운영 전문가 과정",
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

// Weekly Exam Bank — 회당 3문제 (총 500회 / 1,500문제 중 제1회)
const weeklyExams = [
  {
    no: 1,
    trackLabel: "TRACK 01 · 우호적 M&A",
    level: "중급",
    levelClass: "level-intermediate",
    type: "주관식 서술형",
    prompt:
      "M&A를 활용한 외적 성장(Buy)이 내적 성장(Build) 대비 갖는 장점 5가지를 설명하고, 각 장점이 실전에서 무너지는 조건을 함께 제시하십시오.",
    dojoOpening:
      "어서 오십시오. 프론티어 M&A 아카데미 수석 조교 '서암'입니다. 제1회 문제 1: <M&A 외적 성장(Buy)이 내적 성장(Build) 대비 갖는 5가지 장점>에 대한 수강생님의 실전 사고 답안을 입력해 주십시오. 정답은 알려드리지 않으며, 실전에서 그 논리가 무너지는 조건까지 되묻겠습니다."
  },
  {
    no: 2,
    trackLabel: "TRACK 02 · 적대적 M&A",
    level: "상급",
    levelClass: "level-advanced",
    type: "주관식 서술형",
    prompt:
      "대상회사가 포이즌필을 발동한 상황에서 이를 무력화할 법적·전술적 논거를 구성하고, 백기사 연대가 형성될 경우의 대응 시나리오를 서술하십시오.",
    dojoOpening:
      "제1회 문제 2를 담당하는 조교 '서암'입니다. 포이즌필 무력화 논거와 백기사 연대 대응 시나리오에 대한 답안을 제출해 주십시오. 상법·자본시장법상 근거와 함께, 그 전술이 실패하는 조건까지 사고하신 답안을 기대합니다."
  },
  {
    no: 3,
    trackLabel: "TRACK 03 · 경영권투자",
    level: "초급",
    levelClass: "level-elementary",
    type: "주관식 서술형",
    prompt:
      "SPA 가격조정 방식인 Locked-Box와 Closing Accounts의 구조적 차이를 설명하고, 매수인 관점에서 각 방식이 부담하는 리스크를 비교하십시오.",
    dojoOpening:
      "제1회 문제 3을 담당하는 조교 '서암'입니다. Locked-Box와 Closing Accounts의 구조적 차이 및 매수인 리스크에 대한 답안을 제출해 주십시오. 정의 나열에 그치지 마시고, 어느 조건에서 어느 방식이 불리해지는지까지 짚어 주십시오."
  }
];

// 학습 퍼널 5단계 (기획서 §2.1)
const funnelSteps = [
  {
    index: "STEP 01",
    name: "비회원 · 무료회원",
    desc: "메인 열람, 무료 워밍업 문제 풀이, 공개 웹 핸드북 1장 체험",
    gate: false
  },
  {
    index: "STEP 02",
    name: "유료 회원",
    desc: "5개 트랙 핸드북 전체 열람, 주간 3문제 제출, 체크리스트 저장",
    gate: false
  },
  {
    index: "STEP 03",
    name: "AI 조교 문답",
    desc: "정답 비공개 소크라테스 반문으로 24시간 실전 사고 단련",
    gate: false
  },
  {
    index: "STEP 04",
    name: "레벨 테스트",
    desc: "트랙별 서술형 정규 테스트 응시 · 커트라인 80점",
    gate: true
  },
  {
    index: "STEP 05",
    name: "오프라인 Deal Lab",
    desc: "성보경 회장 주관 1:1~10:1 소수정예 모의 협상 참가",
    gate: false
  }
];

// 등급별 권한 매트릭스 (기획서 §2.2)
const permissionMatrix = {
  columns: ["비회원", "무료 회원", "유료 회원", "오프라인 자격자"],
  rows: [
    { label: "메인 · 소개 페이지 열람", cells: ["O", "O", "O", "O"] },
    { label: "무료 워밍업 문제 풀이", cells: ["O", "O", "O", "O"] },
    { label: "웹 핸드북 열람", cells: ["1장 샘플", "1장 전체", "전체 · 체크 저장", "전체 열람"] },
    { label: "정규 평가 문제 제출", cells: ["X", "X", "O(주 3문제)", "O"] },
    { label: "AI 조교 '서암' 실시간 문답", cells: ["X", "X", "O", "O"] },
    { label: "수강생 토론 댓글 작성", cells: ["X", "읽기 전용", "O", "O"] },
    { label: "주간 회장 판정문 열람", cells: ["요약만", "요약만", "전문 열람", "전문 열람"] },
    { label: "오프라인 Deal Lab 신청", cells: ["X", "X", "X", "O"] }
  ]
};

// 주간 운영 사이클
const weeklyCycle = [
  { when: "월요일", what: "주간 3문제 출제", who: "성보경 회장 · 비공개 출제 의도 등록" },
  { when: "월 – 토", what: "답안 제출 & 소크라테스 문답", who: "수강생 ↔ AI 조교 '서암' · 24시간" },
  { when: "토요일 밤", what: "토론 데이터 전수 분석", who: "AI 엔진 · 우수 후보 5건 선별" },
  { when: "일요일 아침", what: "AI 리포트 → 회장 판정", who: "회장 검토 15분 · 인영 발행" }
];

// Primary navigation — shared by the inline bar and the mobile drawer
const navItems = [
  { href: "#funnel", label: "수강 여정" },
  { href: "#exam", label: "금주의 문제" },
  { href: "#dojo", label: "AI 조교 서암" },
  { href: "#verdict", label: "회장 판정관" },
  { href: "#handbook", label: "웹 핸드북" },
  { href: "#leveltest", label: "레벨 테스트" }
];

// Mock Discussion Thread Data
const initialComments = [
  {
    id: 1,
    user: "박현우 대표(PEF 파트너)",
    time: "2시간 전",
    isBest: true,
    content: "M&A의 외적 성장 장점 5가지 중 '시간의 구매'가 가장 핵심이나, 경영권 프리미엄이 35%를 초과할 경우 인수 후 창출 가능한 밸류업 EBITDA 상승폭을 상쇄하게 됩니다. 따라서 정밀실사 단계에서 Lock-up 2년 조건 및 에스크로 20% 보상이 동반되지 않으면 승자의 저주로 이어집니다."
  },
  {
    id: 2,
    user: "김진성 이사(전략기획실)",
    time: "4시간 전",
    isBest: false,
    content: "시너지 효과(Synergy)를 기대할 때 가장 큰 한계는 기업 문화 간 화학적 결합(PMI) 실패입니다. 피인수기업 핵심 기술진의 이탈을 막을 스톡옵션 재할당 및 거버넌스 보장이 미비하면 외적 성장은 도리어 독이 됩니다."
  },
  {
    id: 3,
    user: "최서연 이사(패밀리오피스 CSO)",
    time: "1일 전",
    isBest: true,
    content: "적대적 M&A 방어 측면에서 포이즌필이 무력화될 경우, 스텔스 지분 매집에 대응하기 위해서는 상법상 의결권 제한 주식 3% 룰을 우회하는 주주 연대 약정(Tag-along/Drag-along)을 사전에 정밀하게 수립해 두는 것이 필수적입니다."
  }
];

export default function Home() {
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const currentTrack = tracks[selectedTrackIndex];

  // Opening curtain: holds ~3s, lifts over 0.9s, then unmounts.
  // Rendered on the server too, so the page never flashes before it appears.
  const [loader, setLoader] = useState<"loading" | "exiting" | "done">("loading");
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
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
    const count = countRef.current;
    const bar = barRef.current;
    if (!count || !bar) return;
    const paint = (v: number) => {
      count.textContent = String(Math.round(v * 100)).padStart(3, "0");
      bar.style.transform = `scaleX(${v})`;
    };
    const DURATION = 4600;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      // Decelerating, so it settles into 100 rather than snapping there
      paint(1 - Math.pow(1 - p, 2.2));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
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
      ".section-heading, .tier-grid, .funnel-rail, .matrix-scroll, .exam-grid, .exam-notice, .exam-dossier, .dojo-container, .verdict-container, .thread-container, .track-grid, .handbook-window, .leveltest-grid"
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

  // Weekly Exam selection — drives which question the AI Dojo is proctoring
  const [selectedExamIndex, setSelectedExamIndex] = useState(0);
  const currentExam = weeklyExams[selectedExamIndex];

  // AI Socrates Dojo Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "ai",
      name: "조교 서암(書巖)",
      time: "실시간",
      text: weeklyExams[0].dojoOpening
    }
  ]);

  // Selecting a different weekly question restarts the dojo session for that question
  const handleSelectExam = (index: number) => {
    setSelectedExamIndex(index);
    setChatMessages([
      {
        sender: "ai",
        name: "조교 서암(書巖)",
        time: "실시간",
        text: weeklyExams[index].dojoOpening
      }
    ]);
    setInputAnswer("");
    setQualifiedFlag(false);
  };
  const [inputAnswer, setInputAnswer] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [qualifiedFlag, setQualifiedFlag] = useState(false);

  // Discussion Thread State
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");

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

  // AI Socrates Response Handler (System Prompt Engine logic implementation)
  const handleSendAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAnswer.trim() || isTyping) return;

    const userText = inputAnswer;
    const newMsg = {
      sender: "student",
      name: "수강생(답안 제출)",
      time: "방금 전",
      text: userText
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputAnswer("");
    setIsTyping(true);

    // Simulate AI Socratic counter-question based on prompt rules
    setTimeout(() => {
      let aiCounterQuestion = "";
      const lower = userText.toLowerCase();

      if (lower.includes("시간") || lower.includes("단축") || lower.includes("buy")) {
        aiCounterQuestion = "시간의 구매라는 장점에는 동의합니다. 하지만 타깃 기업을 서둘러 인수하기 위해 지불한 경영권 프리미엄이 40%를 넘어서고 인수금융 조달 금리가 상승하면, 시간 단축으로 얻는 수익보다 이자 비용이 더 커지는 리스크는 실전에서 어떻게 방어하시겠습니까?";
      } else if (lower.includes("인재") || lower.includes("기술") || lower.includes("시너지")) {
        aiCounterQuestion = "인력 및 시너지 확보를 언급하셨습니다. 그런데 인수 계약 체결 후 PMI 1년 이내에 피인수기업의 핵심 인재 30%가 이탈한다면 수강생님은 결국 무엇을 산 셈이 됩니까? 이를 막기 위한 계약상 Lock-up 및 손해배상 청구 조항은 어떻게 구성하겠습니까?";
      } else if (lower.includes("시장") || lower.includes("점유율") || lower.includes("경쟁")) {
        aiCounterQuestion = "시장 점유율 신속 확보 관점은 훌륭합니다. 하지만 경쟁당국의 기업결합 심사에서 독과점 시정조치가 내려지거나 사업부 매각 명령이 내려지면 외적 성장 전략은 무산됩니다. 정밀실사 단계에서 이 규제 리스크를 어떻게 사전 검증하시겠습니까?";
      } else {
        aiCounterQuestion = "제시해 주신 장점 논리는 원론적으로 타당합니다. 그러나 이 전략이 실전 M&A 현장에서 '승자의 저주(Winner's Curse)'로 반전되는 결정적 순간은 언제라고 생각하십니까? 그 한계 조건 한 가지를 정량적으로 짚어보십시오.";
      }

      // Check if depth is achieved
      if (chatMessages.length >= 3) {
        setQualifiedFlag(true);
        aiCounterQuestion += "[안내] 수강생님께서 리스크와 실전 한계 조건까지 깊이 있게 답변해 주셨습니다. 이 답안은 일요일에 생성되는 '주간 AI 요약 리포트'의 우수 답안 후보로 성보경 회장님께 전달하겠습니다.";
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          name: "조교 서암(書巖)",
          time: "방금 전",
          text: aiCounterQuestion
        }
      ]);
      setIsTyping(false);
    }, 1200);
  };

  // Add Comment Handler
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setComments((prev) => [
      {
        id: Date.now(),
        user: "수강생(신규 제출)",
        time: "방금 전",
        isBest: false,
        content: newComment
      },
      ...prev
    ]);
    setNewComment("");
  };

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
              <img className="loader-mark loader-mark--l" src="/logo-frontier-symbol-white.png" alt="" width={51} height={44} />
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
              <img className="loader-mark loader-mark--r" src="/logo-frontier-symbol-white.png" alt="" width={51} height={44} />
              <span className="loader-seal">
                <span>成 甫</span>
                <span>京 印</span>
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
            src={isScrolled ? "/logo-frontier-symbol.png" : "/logo-frontier-symbol-white.png"}
            alt=""
            width={44}
            height={38}
            aria-hidden="true"
          />
          <span className="brand-wordmark">
            <span className="brand-name">FRONTIER M&amp;A</span>
            <span className="brand-descriptor">M&amp;A MASTERY ACADEMY</span>
          </span>
        </a>
        <nav className="primary-nav" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>

        <div className="header-actions">
          <a className="header-login" href="#dojo">AI 도장 입장 <span>↗</span></a>
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
        {navItems.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setIsNavOpen(false)}>
            <span>{item.label}</span>
            <i aria-hidden="true">→</i>
          </a>
        ))}
        <a className="button button-red mobile-nav-cta" href="#dojo" onClick={() => setIsNavOpen(false)}>
          AI 도장 입장 <span>↗</span>
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
            AI가 답할 수 없는<br />
            <em>마지막 10%</em>를 가르친다.
          </h1>
          <p className="hero-description">
            ㈜프론티어 M&amp;A 성보경 회장의 40년 실전 자산(500회 · 1,500문제)과
            24시간 사고를 단련하는 AI 소크라테스 조교 &lsquo;서암&rsquo;이 결합된 초프리미엄 과정.
          </p>
          <div className="hero-actions">
            <a className="button button-red on-dark" href="#exam">제1회 문제 풀기 <span>↗</span></a>
            <a className="button button-gold on-dark" href="#handbook">5대 트랙 핸드북 <span>↓</span></a>
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

      {/* 3-Tier Operating Architecture Section */}
      <section className="section band-white band-hair">
        <span className="section-marker" aria-hidden="true">STRUCTURE</span>
        <div style={{ textAlign: "center", maxWidth: "800px", margin: "auto" }}>
          <p className="section-index">운영 구조 <i>Operating Model</i></p>

          <h2 style={{ fontSize: "38px" }}>실전 사고를 완성하는 3층 하이브리드 퍼널</h2>
          <p style={{ fontSize: "15px", color: "var(--muted)", lineHeight: "1.8" }}>
            AI 조교가 정답을 대신 말하지 않고 수강생의 논리적 허점을 파고듭니다. 회장은 주 1회 판정에만 집중해, 채점 부담은 줄이고 교육의 격은 지킵니다.
          </p>
        </div>

        <div className="tier-grid">
          <div className="tier-card">
            <span className="tier-badge">TIER 1 : STUDENT</span>
            <h3>수강생(Student)</h3>
            <p>회차별 주관식 서술형 답안을 제출하고, 토론 게시판에서 동료 수강생과 치열하게 논쟁합니다.</p>
          </div>
          <div className="tier-card" style={{ borderColor: "var(--ember)" }}>
            <span className="tier-badge" style={{ background: "var(--ember-soft)", color: "var(--ember-ink)" }}>TIER 2 : AI AGENT</span>
            <h3>AI 조교 &lsquo;서암&rsquo;(Seoam)</h3>
            <p>정답을 공개하지 않는 소크라테스식 반문으로 24시간 튜터링하고, 주간 토론 데이터를 전수 분석해 요약 보고서를 생성합니다.</p>
          </div>
          <div className="tier-card" style={{ background: "var(--ink-strong)", color: "#fff" }}>
            <span className="tier-badge" style={{ background: "var(--heritage-gold)", color: "var(--ground)" }}>TIER 3 : MASTER</span>
            <h3 style={{ color: "#fff" }}>성보경 회장(Master)</h3>
            <p style={{ color: "var(--label-on-dark)" }}>주 1회 AI 주간 리포트를 검토(15분 소요)한 뒤, 금주의 우수 답안을 선정하고 공식 인영(成甫京) 판정문을 발행합니다.</p>
          </div>
        </div>
      </section>

      {/* Learning Funnel & Permission Matrix (기획서 §2.1–2.2) */}
      <section className="section band-paper band-hair" id="funnel">
        <span className="section-marker" aria-hidden="true">ADMISSIONS</span>
        <div className="section-heading">
          <div>
            <p className="section-index">학사 과정 <i>Admissions &amp; Access</i></p>
            <h2>수강 여정 5단계와<br /><em>등급별 권한 구조</em></h2>
          </div>
          <p>
            온라인이 기초 교육과 수준 검증(필터링)을 담당하고, 검증된 인원만 오프라인 심화 과정으로 연결됩니다. 레벨 테스트가 유일한 관문(Gate)입니다.
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
            <caption className="sr-only">회원 등급별 기능 접근 권한 매트릭스</caption>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: "left" }}>기능 / 등급</th>
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

      {/* Weekly Exam Section (SCR-01 §1.3) */}
      <section className="section band-white band-hair" id="exam">
        <span className="section-marker" aria-hidden="true">ASSESSMENT</span>
        <div className="section-heading">
          <div>
            <p className="section-index">금주의 평가 <i>Weekly Assessment</i></p>
            <h2>금주의 문제<br /><em>회당 3문제 · 총 500회</em></h2>
          </div>
          <p>
            문제를 선택하면 아래 AI 조교 &lsquo;서암&rsquo;의 도장이 해당 문제로 전환됩니다. 회차당 3문제가 초·중·상급으로 출제되며, 트랙을 가로질러 실전 사고를 단련합니다.
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
                <span className="exam-tag">제1회 · 문제 {exam.no}</span>
                <span className={`exam-tag ${exam.levelClass}`}>{exam.level}</span>
                <span className="exam-tag">{exam.type}</span>
              </div>
              <p className="exam-prompt">[문제] {exam.prompt}</p>
              <span className="exam-select-cue">
                {selectedExamIndex === idx ? "AI 도장에서 진행 중" : "이 문제로 도장 열기"}
                <i style={{ fontStyle: "normal" }}>{selectedExamIndex === idx ? "●" : "→"}</i>
              </span>
            </button>
          ))}
        </div>

        <p className="exam-notice">
          <strong>출제자 안내 —</strong> 정답은 공개되지 않습니다. 교과서적 지식을 나열하는 답안보다, 실전에서 그 장점과 전략이 무너지는 한계 조건까지 사고한 답안이 높이 평가됩니다.
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
              <span>成 甫</span>
              <span>京 印</span>
            </div>
          </div>
        </aside>
      </section>

      {/* AI Socrates Interactive Dojo Section (SCR-02) */}
      <section className="section band-paper band-hair" id="dojo">
        <span className="section-marker" aria-hidden="true">TUTORING</span>
        <div className="section-heading">
          <div>
            <p className="section-index">AI 튜터링 <i>Socratic Tutoring</i></p>
            <h2>AI 소크라테스 조교<br /><em>&lsquo;서암(書巖)&rsquo; 전용 도장</em></h2>
          </div>
          <p>정답을 절대 직접 알려주지 않습니다. 수강생이 제출한 답안의 실전 리스크와 한계 조건을 찌르는 소크라테스식 반문을 24시간 제공합니다.</p>
        </div>

        <div className="dojo-container">
          <div className="dojo-header">
            <div className="dojo-header-left">
              <div className="dojo-status-dot" />
              <h4>조교 서암(書巖) · 제1회 문제 {currentExam.no} 담당 · 실시간 운영 중</h4>
            </div>
            <div className="dojo-header-right">
              {qualifiedFlag && (
                <span className="dojo-flag-badge">우수 답안 후보 등재</span>
              )}
              <span className="dojo-engine">
                <span className="partner-label">AI SYSTEM BY</span>
                {/* Wordmark-only form at ≥100px — the full signature may not go
                    below 180px (TenAI guideline §04) */}
                {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
                <img
                  className="partner-logo-sm"
                  src="/logo-tenai-wordmark-dark.png"
                  alt="TenAI"
                  width={116}
                  height={33}
                />
              </span>
            </div>
          </div>

          <div style={{ padding: "16px 24px", background: "var(--warm-white)", borderBottom: "1px solid var(--line-color)" }}>
            <span className="exam-track-label">{currentExam.trackLabel} · {currentExam.level}</span>
            <p style={{ font: "600 14.5px/1.7 var(--font-serif)", color: "var(--ink-strong)", margin: "8px 0 0" }}>
              [문제] {currentExam.prompt}
            </p>
          </div>

          <div className="dojo-rules-bar">
            <span className="rules-label">운영 수칙</span>
            <span>① 정답 절대 비공개</span>
            <span>② 1회 1반문 제기</span>
            <span>③ 실전 한계 파고들기</span>
            <span>④ 주간 보고서 연동</span>
          </div>

          <div className="dojo-chat-box">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`chat-msg ${msg.sender === "ai" ? "chat-msg-ai" : "chat-msg-student"}`}
              >
                <div className="chat-sender">
                  {msg.name} · {msg.time}
                </div>
                <div className={`chat-bubble ${msg.sender === "ai" ? "chat-bubble-ai" : "chat-bubble-student"}`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-msg chat-msg-ai">
                <div className="chat-sender">조교 서암 · 사고 중&hellip;</div>
                <div className="chat-bubble chat-bubble-ai">
                  <span className="typing-dots">
                    <span /><span /><span />
                  </span>{" "}
                  수강생 답안의 논리적 허점 및 실전 리스크 반문을 구성하고 있습니다...
                </div>
              </div>
            )}
          </div>

          <form className="dojo-input-area" onSubmit={handleSendAnswer}>
            <textarea
              className="dojo-textarea"
              placeholder="예: M&A 외적 성장은 신규 사업 진입 시 시간의 구매(Time to Market) 효과가 있어 내적 성장 대비 속도가 빠르고 인재와 핵심 기술을 일괄 확보할 수 있습니다..."
              value={inputAnswer}
              onChange={(e) => setInputAnswer(e.target.value)}
            />
            <div className="dojo-input-footer">
              <span className="dojo-hint">
                단순 교과서 정답보다 &ldquo;경영권 프리미엄 과다, PMI 실패&rdquo; 등 실전 리스크까지 기술해 보세요.
              </span>
              <button type="submit" className="button button-red" disabled={isTyping}>
                답안 제출 및 AI 반문 받기 <span>→</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Discussion Thread & Chairman Verdict Section (SCR-03) */}
      <section className="section band-white band-hair" id="verdict">
        <span className="section-marker" aria-hidden="true">VERDICT</span>
        <div className="section-heading">
          <div>
            <p className="section-index">주간 판정 <i>Chairman&rsquo;s Verdict</i></p>
            <h2>수강생 토론 쓰레드 &<br /><em>주간 회장 판정관</em></h2>
          </div>
          <p>AI 조교가 종합한 주간 데이터 리포트를 토대로 성보경 회장이 직접 우수 답안을 선별하고 붉은 인영(`成甫京`)을 부여합니다.</p>
        </div>

        {/* Chairman Verdict Card */}
        <div className="verdict-container">
          <div className="verdict-eyebrow">제1회 주간 판정문 · Official Verdict</div>
          <blockquote className="verdict-quote">
            “이번 주 제출된 답안들은 외적 성장의 5가지 장점을 나열하는 데는 충실했으나, <mark>그 장점이 실전 현장에서 무너지는 순간(프리미엄 과다, PMI 인력 이탈)</mark>을 정량적으로 짚어낸 답안은 단 둘뿐이었다.<br className="br-wide" />
            M&amp;A는 장점을 아는 게임이 아니라, <mark>장점이 사라지는 한계 조건</mark>을 통제하는 게임이다.”
          </blockquote>

          <div className="verdict-footer">
            <div className="verdict-author">
              <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>성보경 · ㈜프론티어 M&amp;A 회장</span>
              <span style={{ fontSize: "13px", color: "var(--label-on-dark)" }}>40년 실전 자산 총괄출제 및 주간 최종 판정자</span>
            </div>
            <div className="stamp-seal">
              <span>成 甫</span>
              <span>京 印</span>
            </div>
          </div>

          {/* Weekly operating cycle — 출제부터 판정까지 */}
          <div className="cycle-strip">
            {weeklyCycle.map((c) => (
              <div key={c.when} className="cycle-cell">
                <span className="cycle-when">{c.when}</span>
                <h4 className="cycle-what">{c.what}</h4>
                <p className="cycle-who">{c.who}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Discussion Thread */}
        <div style={{ marginTop: "48px" }}>
          <h3 style={{ font: "700 22px var(--font-serif)", color: "var(--ink-strong)", marginBottom: "20px" }}>
            금주의 수강생 토론 쓰레드 (논쟁 {comments.length}건)
          </h3>

          <form onSubmit={handleAddComment} style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
            <input
              type="text"
              placeholder="동료 수강생의 답안에 대한 논리적 반론이나 의견을 작성해 보세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              style={{
                flex: 1,
                padding: "14px 18px",
                border: "1px solid var(--line-color)",
                background: "var(--white)",
                fontSize: "14px"
              }}
            />
            <button type="submit" className="button button-gold">
              토론 참여 <span>+</span>
            </button>
          </form>

          <div className="thread-container">
            {comments.map((comment) => (
              <div key={comment.id} className="thread-card">
                <div className="thread-header">
                  <span className="thread-user">{comment.user}</span>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {comment.isBest && (
                      <span className="best-badge">
                        회장 선정 우수 답안
                      </span>
                    )}
                    <span style={{ fontSize: "12px", color: "var(--label-ink)" }}>{comment.time}</span>
                  </div>
                </div>
                <div className="thread-body">{comment.content}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Web Handbook Explorer Section (SCR-04) */}
      <section className="section band-paper band-hair" id="handbook">
        <span className="section-marker" aria-hidden="true">CURRICULUM</span>
        <div className="section-heading">
          <div>
            <p className="section-index">커리큘럼 <i>Curriculum &amp; Handbook</i></p>
            <h2>5대 트랙 구조화<br /><em>웹 핸드북 탐색기</em></h2>
          </div>
          <p>단순 PDF가 아닌 체크리스트 상태 저장 및 계약 조항 클릭 복사 코드 블록이 결합된 실무용 탐색기입니다.</p>
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
              <span className="track-en">{t.en}</span>
              <strong>{t.title}</strong>
              <p>{t.description}</p>
              <span className="track-meta">{t.modules} MODULES <i>↗</i></span>
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
                  {chap.title} {chap.done ? "✓" : ""}
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

      {/* Level Test & Offline Deal Lab Section (SCR-05) */}
      <section className="section band-ember" id="leveltest">
        <span className="section-marker" aria-hidden="true">DEAL LAB</span>
        <div className="section-heading">
          <div>
            <p className="section-index section-index--onDark">심화 과정 <i>Deal Lab Admission</i></p>
            <h2 style={{ color: "#fff" }}>레벨 테스트 &<br /><em>오프라인 Deal Lab 수강 자격</em></h2>
          </div>
          <p>
            온라인 정규 테스트(80점 이상)를 통과한 인원에게만 성보경 회장 주관 1:1~10:1 소수정예 오프라인 Deal Lab 모의 협상 참석 자격이 부여됩니다.
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
                레벨 테스트 자동 심사 받기 <span>→</span>
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
                  심사 결과: {levelTestScore}점 / 100점({levelTestScore >= 80 ? "합격 (Deal Lab Eligible)" : "보완 필요"})
                </div>
                <p style={{ fontSize: "13px", marginTop: "8px", color: "rgba(248,247,243,0.82)" }}>
                  {levelTestScore >= 80
                    ? "축하합니다. 트랙 커트라인 80점을 통과하여 성보경 회장 주관 오프라인 Deal Lab 초대장이 발급되었습니다."
                    : "실전 리스크 조항 설정이 다소 부족합니다. AI 조교 서암과의 소크라테스 문답을 통해 보완 후 재응시해 주십시오."}
                </p>
                {levelTestScore >= 80 && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="button button-red on-dark"
                    style={{ marginTop: "12px", width: "100%" }}
                  >
                    오프라인 Deal Lab 신청서 제출 <span>→</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Deal Lab Qualification Info */}
          <div style={{ background: "var(--ground)", padding: "36px", border: "1px solid var(--heritage-gold)" }}>
            <span style={{ font: "700 11px var(--font-label)", color: "var(--heritage-gold)" }}>OFFLINE INTENSIVE DEAL LAB</span>
            <h3 style={{ font: "700 26px var(--font-serif)", color: "#fff", margin: "16px 0" }}>
              소수정예 모의 협상 도장(Deal Lab)
            </h3>
            <p style={{ fontSize: "14.5px", color: "var(--label-on-dark)", lineHeight: "1.8", marginBottom: "24px" }}>
              미창석유 등 40년간의 비공개 실전 사례를 바탕으로 1:1~10:1 소수정예 모의 협상 및 딜 테이킹 세션을 성보경 회장이 직접 진행합니다.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--label-on-dark)" }}>수강 자격 요건</span>
                <strong style={{ color: "var(--heritage-gold)" }}>레벨 테스트 80점 이상</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--label-on-dark)" }}>다음 코호트 정원</span>
                <strong style={{ color: "#fff" }}>최대 10명(선착순 승인)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--label-on-dark)" }}>주관 및 장소</span>
                <strong style={{ color: "#fff" }}>성보경 회장 / 여의도 딜 룸</strong>
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
              오프라인 Deal Lab 수강 신청
            </h3>
            <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "20px" }}>
              레벨 테스트 통과 자격 코드: <strong style={{ color: "var(--ember)" }}>DEAL-LAB-2026-PASS-88</strong>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <input type="text" placeholder="성함(예: 홍길동)" style={{ padding: "12px", border: "1px solid var(--line-color)" }} />
              <input type="text" placeholder="소속 / 직함(예: XX자산운용 대표이사)" style={{ padding: "12px", border: "1px solid var(--line-color)" }} />
              <input type="email" placeholder="이메일 주소" style={{ padding: "12px", border: "1px solid var(--line-color)" }} />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  alert("오프라인 Deal Lab 수강 신청서가 제출되었습니다. 검토 후 안내 연락드리겠습니다.");
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
                src="/logo-frontier-symbol-white.png"
                alt=""
                width={51}
                height={44}
                aria-hidden="true"
              />
              <span className="brand-wordmark">
                <span className="brand-name">FRONTIER M&amp;A</span>
                <span className="brand-descriptor">M&amp;A MASTERY ACADEMY</span>
              </span>
            </div>
            <p className="footer-statement">
              기업의 결합을 설계하고, 더 높은 가치를 세웁니다.<br className="br-wide" />
              대한민국 M&amp;A 1세대 성보경 회장의 40년 실전 자산에 기반한 AI 하이브리드 아카데미입니다.
            </p>
          </div>

          <nav className="footer-nav" aria-label="푸터 메뉴">
            <span className="footer-nav-title">과정 안내</span>
            <a href="#funnel">수강 여정</a>
            <a href="#exam">금주의 문제</a>
            <a href="#dojo">AI 조교 서암</a>
            <a href="#verdict">회장 판정</a>
            <a href="#handbook">웹 핸드북</a>
            <a href="#leveltest">레벨 테스트</a>
          </nav>

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
              AI 소크라테스 조교 &lsquo;서암&rsquo;과 주간 리포트 엔진을<br className="br-wide" />주식회사 텐에이아이가 설계·운영합니다.
            </p>
          </div>
        </div>

        <div className="footer-base">
          <small>© 2026 ㈜프론티어 M&amp;A × 주식회사 텐에이아이. ALL RIGHTS RESERVED.</small>
          <small>STRATEGIC UNION, ENDURING VALUE</small>
        </div>
      </footer>
    </main>
  );
}
