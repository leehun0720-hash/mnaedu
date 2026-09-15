/**
 * TEN AI 홈페이지 빌더 — 시작 템플릿.
 *
 * 빈 화면에서 시작하면 아무것도 만들지 못한다. 그래서 골격이 이미 서 있는
 * 문서를 여러 벌 얹어 두고, 글자만 바꿔도 사이트 하나가 되게 한다.
 *
 * 템플릿은 텐에이아이가 실제로 만나는 고객을 따라 나눈다 —
 * 텐에이아이 자기 소개, AI 교육 과정, AX 컨설팅, 중소기업 회사 소개,
 * 공공기관 사업 안내, 그리고 빈 문서.
 *
 * 텐에이아이 템플릿에 적힌 사실(사업영역·모델·주소)은 tenai.kr 에 공개된
 * 것만 옮겼다. 실적·인증·수치를 지어내지 않는 것이 이 회사 문서의 제1원칙이며,
 * 고객 템플릿의 숫자는 일부러 ○○ 로 비워 두어 채우는 자리임을 드러낸다.
 */

import { BRAND, BRAND_COLORS } from "./brand";
import {
  THEME_PRESETS,
  newId,
  type Section,
  type SectionBase,
  type SiteDoc,
  type Theme,
} from "./types";

function themeOf(id: string): Theme {
  const found = THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
  return { ...found.theme };
}

/** 구역의 공통 껍데기 — 이름과 달라지는 것만 넘긴다 */
function base(name: string, over: Partial<SectionBase> = {}): SectionBase {
  return {
    id: newId(),
    name,
    background: { kind: "none" },
    padding: "lg",
    width: "normal",
    align: "left",
    scheme: "light",
    ...over,
  };
}

const DEEP = BRAND_COLORS.deep;

/** 어느 템플릿에나 붙는 공지 게시판 */
function noticeBoard(lead: string): Section {
  return {
    ...base("공지사항", { background: { kind: "solid", color: "#FFFFFF" } }),
    kind: "board",
    eyebrow: "BOARD",
    title: "공지사항",
    lead,
    boardKey: newId("b"),
    pageSize: 8,
    allowWrite: true,
    posts: [
      {
        id: newId("p"),
        title: "홈페이지를 새로 열었습니다",
        author: "관리자",
        date: "2026-09-01",
        body: "새 홈페이지를 공개했습니다. 앞으로 이곳에서 소식과 자료를 전해 드리겠습니다.",
        notice: true,
      },
      {
        id: newId("p"),
        title: "문의 접수 안내",
        author: "관리자",
        date: "2026-09-03",
        body: "문의는 평일 오전 9시부터 오후 6시까지 접수하며, 영업일 기준 1일 이내에 회신드립니다.",
        notice: false,
      },
    ],
  };
}

/** 고객 템플릿이 공통으로 쓰는 푸터 — 채울 자리를 비워 둔다 */
function customerFooter(brand: string): Section {
  return {
    ...base("푸터", {
      padding: "md",
      width: "wide",
      scheme: "dark",
      background: { kind: "solid", color: DEEP },
    }),
    kind: "footer",
    brand,
    lines: [
      "○○시 ○○구 ○○로 00, 0층",
      "대표전화 00-0000-0000 · 사업자등록번호 000-00-00000",
    ],
    links: [{ label: "개인정보처리방침" }, { label: "이용약관" }, { label: "오시는 길" }],
  };
}

/** 상담·문의를 부르는 띠 */
function contactCta(title: string, desc: string, button: string, note: string): Section {
  return {
    ...base("문의 배너", {
      align: "center",
      scheme: "dark",
      background: { kind: "solid", color: DEEP },
    }),
    kind: "cta",
    title,
    desc,
    button,
    note,
  };
}

/* ────────────────────────────────────────────────────────────
   1. 텐에이아이 소개 — 이 회사 자신의 사이트 골격
   ──────────────────────────────────────────────────────────── */

function tenaiDoc(): SiteDoc {
  return {
    version: 1,
    title: "TEN AI 소개",
    theme: themeOf("tenai"),
    sections: [
      {
        ...base("상단 메뉴", {
          padding: "sm",
          width: "wide",
          background: { kind: "solid", color: "#FFFFFF" },
        }),
        kind: "header",
        logo: BRAND.company,
        // 로고 아래 줄은 자간을 벌려 세운다 — 한글을 넣으면 글자가 흩어져 보인다
        sub: "AI · AX · EDUCATION",
        logoImage: "",
        logoHeight: 34,
        menu: [
          { label: "소개 & 철학" },
          { label: "사업영역" },
          { label: "교육 아카데미" },
          { label: "소식·Q&A" },
        ],
        cta: "문의하기",
      },
      {
        ...base("히어로", {
          padding: "xl",
          scheme: "dark",
          background: { kind: "gradient", from: DEEP, to: "#123A63", angle: 155 },
        }),
        kind: "hero",
        eyebrow: BRAND.sloganEn,
        title: "AI를 배우는 시대에서,",
        titleEm: "AI로 배우는 시대로",
        desc: BRAND.tagline + ". 활용 중심의 AI로 실천형 인공지능 생태계를 만듭니다.",
        primary: "교육 아카데미 둘러보기",
        secondary: "사업영역 보기",
        stats: [
          { value: "28B", label: "TenOS-Ko 파라미터" },
          { value: "Ko-First", label: "한국어 우선 설계" },
          { value: "RAG", label: "검색증강 생성 최적화" },
        ],
      },
      {
        ...base("사업영역"),
        kind: "cards",
        eyebrow: "BUSINESS AREAS",
        title: "사업영역",
        lead: "AI 교육 · AX 컨설팅 · AIDC 컨설팅 · AX 플랫폼 — 진단부터 정착까지 한 팀이 수행합니다.",
        columns: 3,
        cards: [
          {
            no: "01",
            title: "AI 교육",
            en: "EDUCATION",
            desc: "중소기업·공공기관·대학을 대상으로 실무형 AI 교육을 제공합니다. AI 리터러시부터 바이브코딩, AI 경영 전략까지 레벨별로 표준화했습니다.",
            meta: "자세히 보기 ↗",
            image: "",
          },
          {
            no: "02",
            title: "AX 컨설팅",
            en: "CONSULTING",
            desc: "정부·지자체·중소기업의 AI 전환(AX) 전략을 세우고, RAG 기반 LLM 솔루션 구축과 조직 내재화까지 지원합니다.",
            meta: "자세히 보기 ↗",
            image: "",
          },
          {
            no: "03",
            title: "AIDC 컨설팅",
            en: "DATA CENTER",
            desc: "AI 데이터센터의 GPU 수요 산정부터 전력·냉각 설계 검토, 보안 아키텍처, 운영 전략까지 자문합니다. 과잉 투자를 막는 것이 첫 번째 목표입니다.",
            meta: "자세히 보기 ↗",
            image: "",
          },
          {
            no: "04",
            title: "AI 시스템 구축",
            en: "SYSTEM",
            desc: "컨설팅으로 그린 전략을 내부망과 현장 위에 올립니다. " + BRAND.model + " 을 온프레미스로 배포해 망분리 환경에서도 외부 유출 없이 운영합니다.",
            meta: "자세히 보기 ↗",
            image: "",
          },
          {
            no: "05",
            title: "AX 플랫폼",
            en: "PLATFORM",
            desc: "TEN AI Hub 에서 교육 핸드북, 실무 툴킷, 프롬프트 템플릿, 구축 사례를 한곳에 모아 제공합니다.",
            meta: "자세히 보기 ↗",
            image: "",
          },
          {
            no: "06",
            title: "AI 강사 양성",
            en: "TRAINER",
            desc: "강사 양성 과정과 사내 강사 제도를 통해, 교육이 끝난 뒤에도 조직이 스스로 AI 교육을 이어가게 만듭니다.",
            meta: "자세히 보기 ↗",
            image: "",
          },
        ],
      },
      {
        ...base("철학", {
          width: "narrow",
          background: { kind: "solid", color: BRAND_COLORS.paper },
        }),
        kind: "rich",
        eyebrow: "PHILOSOPHY",
        title: "기술은 사람을 향할 때 비로소 지능이 됩니다",
        body:
          "텐에이아이는 기술 중심의 AI를 넘어, 사람이 실제로 이해하고 활용할 수 있는 AI 경험을 설계합니다.\n\n복잡한 AI를 사람이 이해하고 실행할 수 있는 경험으로 전환하고, 더 나은 판단과 성과로 이어지도록 연결합니다. 기술보다 실천, 결과보다 과정을 봅니다.",
      },
      {
        ...base("진행 절차", { background: { kind: "solid", color: "#FFFFFF" } }),
        kind: "steps",
        eyebrow: "PROCESS",
        title: "진단부터 정착까지",
        lead: "한 팀이 네 단계를 끝까지 맡습니다. 세 번째 단계에서 실제 업무 위에 올라갑니다.",
        steps: [
          { index: "STEP 01", name: "진단", desc: "업무와 데이터를 살펴 AI가 실제로 값을 하는 자리를 찾습니다.", gate: false },
          { index: "STEP 02", name: "전략 수립", desc: "우선순위와 로드맵을 세우고 투자 규모를 가늠합니다.", gate: false },
          { index: "STEP 03", name: "구축", desc: "RAG·에이전트 기반 시스템을 현장과 내부망 위에 올립니다.", gate: true },
          { index: "STEP 04", name: "정착·교육", desc: "쓰는 사람을 길러 도입이 시범사업에서 끝나지 않게 합니다.", gate: false },
        ],
      },
      noticeBoard("새 소식과 자료를 올리는 자리입니다."),
      contactCta(
        "AI 전환을 검토하고 계십니까?",
        "진단부터 정착까지, 조직에 맞는 길을 함께 찾습니다.",
        "문의하기",
        "· " + BRAND.email,
      ),
      {
        ...base("푸터", {
          padding: "md",
          width: "wide",
          scheme: "dark",
          background: { kind: "solid", color: DEEP },
        }),
        kind: "footer",
        brand: BRAND.company,
        lines: [
          BRAND.addressLines[0] + " " + BRAND.addressLines[1],
          BRAND.email + " · " + BRAND.site,
        ],
        links: [{ label: "소개 & 철학" }, { label: "사업영역" }, { label: "파트너십 문의" }],
      },
    ],
  };
}

/* ────────────────────────────────────────────────────────────
   2. AI 교육 과정 안내
   ──────────────────────────────────────────────────────────── */

function eduDoc(): SiteDoc {
  return {
    version: 1,
    title: "AI 교육 과정 안내",
    theme: themeOf("edu"),
    sections: [
      {
        ...base("상단 메뉴", {
          padding: "sm",
          width: "wide",
          background: { kind: "solid", color: "#FFFFFF" },
        }),
        kind: "header",
        logo: "AI 교육 아카데미",
        sub: "AI ACADEMY",
        logoImage: "",
        logoHeight: 34,
        menu: [{ label: "과정 소개" }, { label: "커리큘럼" }, { label: "수강 안내" }, { label: "공지사항" }],
        cta: "수강 신청",
      },
      {
        ...base("히어로", {
          padding: "xl",
          scheme: "dark",
          background: { kind: "gradient", from: "#3A1D08", to: "#8F3D0C", angle: 150 },
        }),
        kind: "hero",
        eyebrow: "AI LITERACY · GENERATIVE AI · VIBE CODING",
        title: "배우고 끝나지 않는",
        titleEm: "실무형 AI 교육",
        desc: "AI 리터러시부터 생성형 AI 실무, 비개발자를 위한 바이브코딩까지 레벨별로 짰습니다. 배운 것을 그날 업무에 쓰는 것이 목표입니다.",
        primary: "수강 신청",
        secondary: "커리큘럼 보기",
        stats: [
          { value: "3단계", label: "레벨 구성" },
          { value: "○○시간", label: "총 교육 시간" },
          { value: "○○명", label: "회차당 정원" },
        ],
      },
      {
        ...base("과정"),
        kind: "cards",
        eyebrow: "COURSES",
        title: "과정 소개",
        lead: "대상과 목적에 따라 세 갈래로 나눕니다. 한 과정만 들어도 업무가 바뀝니다.",
        columns: 3,
        cards: [
          {
            no: "L1",
            title: "AI 리터러시",
            en: "LITERACY",
            desc: "전 직원 대상 입문 과정. AI가 무엇을 잘하고 무엇을 못하는지, 어디까지 믿어도 되는지를 가립니다.",
            meta: "전 직원 · 입문",
            image: "",
          },
          {
            no: "L2",
            title: "생성형 AI 실무",
            en: "GENERATIVE AI",
            desc: "보고서·기획·분석 업무에 바로 쓰는 프롬프트 설계와 검증 절차를 익힙니다.",
            meta: "실무자 · 중급",
            image: "",
          },
          {
            no: "L2",
            title: "바이브코딩",
            en: "VIBE CODING",
            desc: "비개발자가 자연어로 업무 도구를 만듭니다. 개발을 배우지 않고도 필요한 것을 직접 만듭니다.",
            meta: "비개발자 · 중급",
            image: "",
          },
        ],
      },
      {
        ...base("커리큘럼", { background: { kind: "solid", color: "#FFFFFF" } }),
        kind: "list",
        eyebrow: "CURRICULUM",
        title: "세부 주제",
        lead: "회차별로 다루는 내용입니다. 조직의 사정에 맞추어 덜고 더할 수 있습니다.",
        items: [
          { no: "01", label: "AI의 쓸모와 한계 — 무엇을 맡기고 무엇을 맡기지 않는가", meta: "2시간", tags: ["입문"] },
          { no: "02", label: "프롬프트의 구조 — 맥락·역할·제약·예시", meta: "3시간", tags: ["입문", "실무"] },
          { no: "03", label: "업무 문서 자동화 — 보고서·회의록·기획안", meta: "3시간", tags: ["실무"] },
          { no: "04", label: "자료 검증과 환각 다루기 — 근거를 요구하는 법", meta: "2시간", tags: ["실무"] },
          { no: "05", label: "바이브코딩 — 자연어로 업무 도구 만들기", meta: "4시간", tags: ["심화"] },
          { no: "06", label: "조직 확산 — 사내 규칙과 사내 강사 만들기", meta: "2시간", tags: ["심화"] },
        ],
      },
      {
        ...base("대상별 과정"),
        kind: "table",
        eyebrow: "WHO",
        title: "대상별 과정",
        lead: "누가 어떤 과정을 듣는지 한눈에 봅니다.",
        columns: ["전 직원", "실무자", "경영진"],
        rows: [
          { label: "AI 리터러시", cells: ["O", "O", "O"] },
          { label: "생성형 AI 실무", cells: ["X", "O", "O"] },
          { label: "바이브코딩", cells: ["X", "O", "X"] },
          { label: "AI 경영 전략", cells: ["X", "X", "O"] },
        ],
      },
      {
        ...base("수강 절차", { background: { kind: "solid", color: "#FFFFFF" } }),
        kind: "steps",
        eyebrow: "HOW",
        title: "수강 절차",
        lead: "문의부터 수료까지 네 단계입니다.",
        steps: [
          { index: "STEP 01", name: "문의·상담", desc: "조직의 인원과 목표를 듣고 과정을 고릅니다.", gate: false },
          { index: "STEP 02", name: "과정 설계", desc: "업무에 맞게 회차와 실습 과제를 맞춥니다.", gate: false },
          { index: "STEP 03", name: "교육 진행", desc: "실습 중심으로 진행하며, 그날 업무 자료로 연습합니다.", gate: true },
          { index: "STEP 04", name: "수료·정착", desc: "사내 강사와 규칙을 남겨 교육이 끝나도 이어지게 합니다.", gate: false },
        ],
      },
      noticeBoard("개강 일정과 교육 자료를 올리는 자리입니다."),
      contactCta(
        "교육을 검토하고 계십니까?",
        "인원과 목표를 알려 주시면 과정을 맞추어 제안드립니다.",
        "교육 문의",
        "· 조직 맞춤 설계 · 온·오프라인 모두 가능",
      ),
      customerFooter("AI 교육 아카데미"),
    ],
  };
}

/* ────────────────────────────────────────────────────────────
   3. AX 컨설팅
   ──────────────────────────────────────────────────────────── */

function axDoc(): SiteDoc {
  return {
    version: 1,
    title: "AX 컨설팅 안내",
    theme: themeOf("tenai"),
    sections: [
      {
        ...base("상단 메뉴", {
          padding: "sm",
          width: "wide",
          background: { kind: "solid", color: "#FFFFFF" },
        }),
        kind: "header",
        logo: "AX 컨설팅",
        sub: "AI TRANSFORMATION",
        logoImage: "",
        logoHeight: 34,
        menu: [{ label: "진단" }, { label: "전략" }, { label: "구축" }, { label: "사례" }],
        cta: "진단 신청",
      },
      {
        ...base("히어로", {
          padding: "xl",
          scheme: "dark",
          background: { kind: "gradient", from: DEEP, to: "#0B4A86", angle: 150 },
        }),
        kind: "hero",
        eyebrow: "DIAGNOSE · STRATEGY · BUILD · SETTLE",
        title: "도입이 아니라",
        titleEm: "정착까지 봅니다",
        desc: "시범사업에서 끝나는 AI 도입을 너무 많이 봤습니다. 진단에서 정착까지 한 팀이 맡아, 쓰는 사람이 생길 때까지 함께합니다.",
        primary: "진단 신청",
        secondary: "수행 범위 보기",
        stats: [
          { value: "4단계", label: "수행 절차" },
          { value: "온프레미스", label: "망분리 대응" },
          { value: "RAG", label: "근거 기반 답변" },
        ],
      },
      {
        ...base("수행 절차"),
        kind: "steps",
        eyebrow: "PROCESS",
        title: "수행 절차",
        lead: "진단 없이 구축부터 하지 않습니다. 세 번째 단계가 가장 무겁습니다.",
        steps: [
          { index: "STEP 01", name: "AX 진단", desc: "업무·데이터·조직을 살펴 AI가 값을 하는 자리를 찾습니다.", gate: false },
          { index: "STEP 02", name: "전략·로드맵", desc: "우선순위와 일정, 투자 규모와 기대 효과를 정합니다.", gate: false },
          { index: "STEP 03", name: "구축", desc: "RAG·에이전트 시스템을 내부망 위에 올리고 기존 시스템과 잇습니다.", gate: true },
          { index: "STEP 04", name: "정착·내재화", desc: "교육과 사내 규칙으로 조직이 스스로 굴리게 만듭니다.", gate: false },
        ],
      },
      {
        ...base("제공 범위", { background: { kind: "solid", color: "#FFFFFF" } }),
        kind: "cards",
        eyebrow: "SCOPE",
        title: "제공 범위",
        lead: "필요한 만큼만 고르실 수 있습니다.",
        columns: 3,
        cards: [
          {
            no: "01",
            title: "RAG 지식 검색",
            en: "RAG",
            desc: "흩어진 문서를 한 자리에서 찾고, 답변마다 근거 문서를 함께 답니다.",
            meta: "",
            image: "",
          },
          {
            no: "02",
            title: "문서 작성·검토 자동화",
            en: "DOCUMENT",
            desc: "보고서·공문·검토 의견의 초안을 만들고, 사람은 고치는 일만 합니다.",
            meta: "",
            image: "",
          },
          {
            no: "03",
            title: "온프레미스 배포",
            en: "ON-PREMISE",
            desc: "망분리 환경에 자체 한국어 모델을 올려 외부로 자료가 나가지 않게 합니다.",
            meta: "",
            image: "",
          },
        ],
      },
      {
        ...base("단계별 산출물"),
        kind: "table",
        eyebrow: "DELIVERABLES",
        title: "단계별 산출물",
        lead: "각 단계가 끝날 때 손에 남는 것입니다.",
        columns: ["진단", "전략", "구축"],
        rows: [
          { label: "업무·데이터 현황 보고서", cells: ["O", "O", "O"] },
          { label: "AX 로드맵", cells: ["X", "O", "O"] },
          { label: "시스템 설계서", cells: ["X", "X", "O"] },
          { label: "운영·교육 계획", cells: ["X", "X", "O"] },
        ],
      },
      contactCta(
        "어디서부터 손대야 할지 모르겠다면",
        "진단부터 시작하십시오. 무엇을 하지 말아야 하는지도 함께 알려 드립니다.",
        "진단 신청",
        "· 상담 내용은 외부에 공개되지 않습니다",
      ),
      customerFooter("AX 컨설팅"),
    ],
  };
}

/* ────────────────────────────────────────────────────────────
   4. 중소기업 회사 소개 — 고객에게 그대로 건네는 범용 골격
   ──────────────────────────────────────────────────────────── */

function corpDoc(): SiteDoc {
  return {
    version: 1,
    title: "회사 소개",
    theme: themeOf("tenai"),
    sections: [
      {
        ...base("상단 메뉴", {
          padding: "sm",
          width: "wide",
          background: { kind: "solid", color: "#FFFFFF" },
        }),
        kind: "header",
        logo: "회사 이름",
        sub: "COMPANY",
        logoImage: "",
        logoHeight: 34,
        menu: [{ label: "회사소개" }, { label: "사업영역" }, { label: "제품·서비스" }, { label: "문의" }],
        cta: "상담 신청",
      },
      {
        ...base("히어로", {
          padding: "xl",
          scheme: "dark",
          background: { kind: "gradient", from: DEEP, to: "#123A63", angle: 155 },
        }),
        kind: "hero",
        eyebrow: "SINCE ○○○○",
        title: "한 줄로 각인되는",
        titleEm: "핵심 메시지",
        desc: "무엇을 하는 회사인지, 왜 우리에게 맡겨야 하는지를 두세 문장으로 적습니다. 긴 설명보다 한 문장이 낫습니다.",
        primary: "상담 신청",
        secondary: "회사 소개",
        stats: [
          { value: "○○년", label: "업력" },
          { value: "○○건", label: "수행 실적" },
          { value: "○개", label: "사업 분야" },
        ],
      },
      {
        ...base("사업영역"),
        kind: "cards",
        eyebrow: "BUSINESS",
        title: "사업영역",
        lead: "제공하는 것을 한눈에 보여 주는 자리입니다.",
        columns: 3,
        cards: [1, 2, 3].map((n) => ({
          no: String(n).padStart(2, "0"),
          title: "사업영역 " + n,
          en: "AREA " + n,
          desc: "이 일이 고객의 어떤 문제를 푸는지 한두 문장으로 적습니다.",
          meta: "자세히 보기 ↗",
          image: "",
        })),
      },
      {
        ...base("진행 절차", { background: { kind: "solid", color: "#FFFFFF" } }),
        kind: "steps",
        eyebrow: "PROCESS",
        title: "이렇게 진행합니다",
        lead: "문의부터 완료까지 네 단계로 움직입니다.",
        steps: [
          { index: "STEP 01", name: "문의·접수", desc: "상담을 신청하시면 담당자가 연락드립니다.", gate: false },
          { index: "STEP 02", name: "검토·제안", desc: "요건을 검토하고 방향과 일정을 제안합니다.", gate: false },
          { index: "STEP 03", name: "계약", desc: "조건을 확정하고 착수합니다.", gate: true },
          { index: "STEP 04", name: "수행·완료", desc: "합의한 일정에 따라 수행하고 결과를 보고합니다.", gate: false },
        ],
      },
      {
        ...base("현장 사진"),
        kind: "gallery",
        eyebrow: "GALLERY",
        title: "현장 사진",
        lead: "사진을 올리거나 주소를 붙여 넣으세요. 비워 두면 이 구역은 숨기셔도 됩니다.",
        columns: 3,
        images: [
          { url: "", caption: "사진 설명 1" },
          { url: "", caption: "사진 설명 2" },
          { url: "", caption: "사진 설명 3" },
        ],
      },
      noticeBoard("새 소식과 자료를 올리는 자리입니다."),
      contactCta(
        "문의를 남겨 주세요",
        "담당자가 영업일 기준 1일 이내에 연락드립니다.",
        "상담 신청",
        "· 상담은 무료이며 비밀이 보장됩니다",
      ),
      customerFooter("회사 이름"),
    ],
  };
}

/* ────────────────────────────────────────────────────────────
   5. 공공기관 사업 안내
   ──────────────────────────────────────────────────────────── */

function publicDoc(): SiteDoc {
  return {
    version: 1,
    title: "사업 안내",
    theme: themeOf("gov"),
    sections: [
      {
        ...base("상단 메뉴", {
          padding: "sm",
          width: "wide",
          background: { kind: "solid", color: "#FFFFFF" },
        }),
        kind: "header",
        logo: "○○ 사업",
        sub: "PROJECT",
        logoImage: "",
        logoHeight: 34,
        menu: [{ label: "사업 개요" }, { label: "추진 과제" }, { label: "추진 일정" }, { label: "공지사항" }],
        cta: "참여 신청",
      },
      {
        ...base("히어로", {
          padding: "xl",
          scheme: "dark",
          background: { kind: "gradient", from: "#16345C", to: "#1C3F6E", angle: 160 },
        }),
        kind: "hero",
        eyebrow: "○○기관 · ○○년도 사업",
        title: "사업의 목적을",
        titleEm: "한 문장으로",
        desc: "무엇을 위해, 누구를 대상으로, 언제까지 하는 사업인지를 세 문장 안에 적습니다. 공공 문서일수록 첫 문장이 전부입니다.",
        primary: "참여 신청",
        secondary: "사업 개요 보기",
        stats: [
          { value: "○○년", label: "사업 기간" },
          { value: "○○명", label: "지원 대상" },
          { value: "○억원", label: "사업 규모" },
        ],
      },
      {
        ...base("사업 개요", {
          width: "narrow",
          background: { kind: "solid", color: "#FFFFFF" },
        }),
        kind: "rich",
        eyebrow: "OVERVIEW",
        title: "사업 개요",
        body:
          "추진 배경과 목적을 적습니다. 상위 계획이나 근거 법령이 있으면 여기서 밝힙니다.\n\n대상과 범위, 기간을 이어서 적습니다. 숫자는 확정된 것만 적고, 미정인 항목은 「추후 공고」로 남깁니다.",
      },
      {
        ...base("추진 과제"),
        kind: "list",
        eyebrow: "TASKS",
        title: "추진 과제",
        lead: "사업을 이루는 세부 과제입니다.",
        items: [1, 2, 3, 4].map((n) => ({
          no: String(n).padStart(2, "0"),
          label: "과제 " + n + " — 무엇을 하는지 한 줄로",
          meta: "담당 ○○과",
          tags: ["1단계"],
        })),
      },
      {
        ...base("추진 일정", { background: { kind: "solid", color: "#FFFFFF" } }),
        kind: "table",
        eyebrow: "SCHEDULE",
        title: "추진 일정",
        lead: "분기별 추진 계획입니다.",
        columns: ["1분기", "2분기", "3분기"],
        rows: [
          { label: "공고·접수", cells: ["O", "X", "X"] },
          { label: "선정·협약", cells: ["X", "O", "X"] },
          { label: "수행·점검", cells: ["X", "O", "O"] },
          { label: "성과 보고", cells: ["X", "X", "O"] },
        ],
      },
      noticeBoard("공고와 서식을 올리는 자리입니다."),
      contactCta(
        "참여를 검토하고 계십니까?",
        "공고문과 서식을 확인하시고 기한 안에 신청해 주십시오.",
        "참여 신청",
        "· 문의 ○○과 00-0000-0000",
      ),
      customerFooter("○○기관"),
    ],
  };
}

/* ────────────────────────────────────────────────────────────
   목록
   ──────────────────────────────────────────────────────────── */

export type TemplateId = "tenai" | "edu" | "ax" | "corp" | "public" | "blank";

export const TEMPLATES: {
  id: TemplateId;
  name: string;
  desc: string;
  build: () => SiteDoc;
}[] = [
  { id: "tenai", name: "TEN AI 소개", desc: "사업영역·철학·절차까지 선 텐에이아이 골격", build: tenaiDoc },
  { id: "edu", name: "AI 교육 과정", desc: "과정·커리큘럼·수강 절차가 있는 교육 안내", build: eduDoc },
  { id: "ax", name: "AX 컨설팅", desc: "진단부터 정착까지 네 단계와 산출물", build: axDoc },
  { id: "corp", name: "중소기업 회사 소개", desc: "고객에게 그대로 건네는 범용 회사 소개", build: corpDoc },
  { id: "public", name: "공공기관 사업 안내", desc: "사업 개요·추진 과제·일정·공고 게시판", build: publicDoc },
  { id: "blank", name: "빈 문서", desc: "처음부터 직접 쌓습니다", build: () => blankDoc() },
];

/** 이름으로 템플릿 하나를 만든다 — 모르는 이름이면 기본 템플릿 */
export function buildTemplate(id: string): SiteDoc {
  const found = TEMPLATES.find((t) => t.id === id);
  return found ? found.build() : starterDoc();
}

/** 빌더를 처음 열 때 서 있는 문서 */
export function starterDoc(): SiteDoc {
  return tenaiDoc();
}

/** 빈 문서 — 처음부터 직접 쌓고 싶을 때 */
export function blankDoc(): SiteDoc {
  return {
    version: 1,
    title: "새 홈페이지",
    theme: themeOf("tenai"),
    sections: [],
  };
}
