/**
 * 홈페이지 빌더 — 문서 모델.
 *
 * 이 파일은 순수 데이터 정의만 둔다(서버·브라우저 모두에서 쓰이고, 테스트도
 * 여기서 시작한다). 화면으로 그리는 일은 render.ts, 내보내기는 export.ts가 맡는다.
 *
 * 설계 원칙 — 구역(Section)이 단위다. 잘 만든 기업 사이트가 히어로·서비스 카드·
 * 진행 절차·비교표·목록·게시판·푸터로 짜여 있는 것과 같은 골격을 그대로 조립
 * 부품으로 만든 것이다. 부품마다 배경·여백·정렬·색 반전을 따로 갖는다.
 *
 * 색과 예시 문구는 텐에이아이 톤(미니멀·신뢰감)을 따른다. 고객이 중소기업이든
 * 공공기관이든 글자만 바꾸면 그대로 쓸 수 있는 자리를 만들어 둔다.
 */

import { BRAND_COLORS } from "./brand";

/** 배경 — 구역마다 따로 정한다 */
export type Background =
  | { kind: "none" }
  | { kind: "solid"; color: string }
  | { kind: "gradient"; from: string; to: string; angle: number }
  | { kind: "image"; url: string; overlay: number };

export type Padding = "sm" | "md" | "lg" | "xl";
export type Width = "narrow" | "normal" | "wide" | "full";
export type Align = "left" | "center";
/** 어두운 바탕에서는 글자색을 통째로 뒤집는다 */
export type Scheme = "light" | "dark";

export type SectionBase = {
  id: string;
  /** 좌측 구역 목록에 뜨는 이름 — 회장님이 알아보실 이름이다 */
  name: string;
  background: Background;
  padding: Padding;
  width: Width;
  align: Align;
  scheme: Scheme;
  hidden?: boolean;
};

export type MenuItem = { label: string };
export type Stat = { value: string; label: string };
export type Card = { no: string; title: string; en: string; desc: string; meta: string; image: string };
export type Step = { index: string; name: string; desc: string; gate: boolean };
export type TableRow = { label: string; cells: string[] };
export type ListItem = { no: string; label: string; meta: string; tags: string[] };
export type GalleryImage = { url: string; caption: string };
export type Post = { id: string; title: string; author: string; date: string; body: string; notice: boolean };
export type FooterLink = { label: string };

export type HeaderSection = SectionBase & {
  kind: "header";
  logo: string;
  sub: string;
  /** 로고 그림. 비어 있으면 강조색 네모가 대신 선다. */
  logoImage: string;
  /** 화면에 세울 로고 높이(px). 가로는 비율대로 따라간다. */
  logoHeight: number;
  menu: MenuItem[];
  cta: string;
};

export type HeroSection = SectionBase & {
  kind: "hero";
  eyebrow: string;
  title: string;
  titleEm: string;
  desc: string;
  primary: string;
  secondary: string;
  stats: Stat[];
};

export type CardsSection = SectionBase & {
  kind: "cards";
  eyebrow: string;
  title: string;
  lead: string;
  columns: number;
  cards: Card[];
};

export type StepsSection = SectionBase & {
  kind: "steps";
  eyebrow: string;
  title: string;
  lead: string;
  steps: Step[];
};

export type TableSection = SectionBase & {
  kind: "table";
  eyebrow: string;
  title: string;
  lead: string;
  columns: string[];
  rows: TableRow[];
};

export type ListSection = SectionBase & {
  kind: "list";
  eyebrow: string;
  title: string;
  lead: string;
  items: ListItem[];
};

export type GallerySection = SectionBase & {
  kind: "gallery";
  eyebrow: string;
  title: string;
  lead: string;
  columns: number;
  images: GalleryImage[];
};

export type RichSection = SectionBase & {
  kind: "rich";
  eyebrow: string;
  title: string;
  body: string;
};

export type CtaSection = SectionBase & {
  kind: "cta";
  title: string;
  desc: string;
  button: string;
  note: string;
};

export type BoardSection = SectionBase & {
  kind: "board";
  eyebrow: string;
  title: string;
  lead: string;
  /** 브라우저 저장소에서 이 게시판의 글을 구분하는 열쇠 */
  boardKey: string;
  pageSize: number;
  allowWrite: boolean;
  posts: Post[];
};

export type FooterSection = SectionBase & {
  kind: "footer";
  brand: string;
  lines: string[];
  links: FooterLink[];
};

export type Section =
  | HeaderSection
  | HeroSection
  | CardsSection
  | StepsSection
  | TableSection
  | ListSection
  | GallerySection
  | RichSection
  | CtaSection
  | BoardSection
  | FooterSection;

export type SectionKind = Section["kind"];

export type Theme = {
  accent: string;
  accentInk: string;
  paper: string;
  paperDeep: string;
  ink: string;
  inkStrong: string;
  line: string;
  muted: string;
  heading: "serif" | "sans";
  radius: number;
  /** 본문 기준 글자 크기(px) — 전체 배율의 기준이 된다 */
  fontSize: number;
};

export type SiteDoc = {
  version: 1;
  title: string;
  theme: Theme;
  sections: Section[];
};

/** 구역 추가 화면에 뜨는 목록 — 이름과 한 줄 설명 */
export const SECTION_CATALOG: { kind: SectionKind; name: string; desc: string }[] = [
  { kind: "header", name: "상단 메뉴", desc: "로고 그림·메뉴·오른쪽 버튼" },
  { kind: "hero", name: "히어로", desc: "큰 제목·설명·버튼과 성과 숫자" },
  { kind: "cards", name: "카드 그리드", desc: "분야·서비스·상품을 카드로 나열" },
  { kind: "steps", name: "단계 흐름", desc: "STEP 01~04처럼 순서를 보여 준다" },
  { kind: "table", name: "비교표", desc: "등급·요금처럼 항목을 견주는 표" },
  { kind: "list", name: "목록", desc: "주제·커리큘럼처럼 번호가 붙는 줄 목록" },
  { kind: "gallery", name: "이미지 갤러리", desc: "사진을 격자로 배치" },
  { kind: "rich", name: "글 구역", desc: "제목과 본문 문단" },
  { kind: "cta", name: "강조 배너", desc: "문의·신청을 부르는 띠" },
  { kind: "board", name: "게시판", desc: "공지·자료실 — 글 목록과 쓰기" },
  { kind: "footer", name: "푸터", desc: "회사 정보와 하단 링크" },
];

export const THEME_PRESETS: { id: string; name: string; theme: Theme }[] = [
  {
    id: "tenai",
    name: "텐에이아이 (기본)",
    theme: {
      accent: BRAND_COLORS.primary,
      accentInk: "#0B4A86",
      paper: BRAND_COLORS.paper,
      paperDeep: BRAND_COLORS.tint,
      ink: "#22303F",
      inkStrong: BRAND_COLORS.deep,
      line: "#D6E3F0",
      muted: "#5A6B7C",
      heading: "sans",
      radius: 12,
      fontSize: 16,
    },
  },
  {
    id: "gov",
    name: "중앙부처 (감청·정중)",
    theme: {
      accent: "#1C3F6E",
      accentInk: "#16345C",
      paper: "#F4F6F9",
      paperDeep: "#E8EDF4",
      ink: "#232B35",
      inkStrong: "#141C26",
      line: "#D2DAE4",
      muted: "#5B6673",
      heading: "serif",
      radius: 4,
      fontSize: 16,
    },
  },
  {
    id: "local",
    name: "지자체 (청록·친근)",
    theme: {
      accent: "#0E7C7B",
      accentInk: "#0B6665",
      paper: "#F2F8F7",
      paperDeep: "#E3F0EF",
      ink: "#1F2A2A",
      inkStrong: "#12201F",
      line: "#CCE0DE",
      muted: "#536665",
      heading: "sans",
      radius: 10,
      fontSize: 16,
    },
  },
  {
    id: "edu",
    name: "교육·아카데미 (따뜻한 주황)",
    theme: {
      accent: "#E0632A",
      accentInk: "#BF4E1D",
      paper: "#FBF7F3",
      paperDeep: "#F5EDE5",
      ink: "#2C2621",
      inkStrong: "#1E1916",
      line: "#E4D9CD",
      muted: "#6B5F55",
      heading: "sans",
      radius: 14,
      fontSize: 16,
    },
  },
  {
    id: "mono",
    name: "모노 (IT·스타트업)",
    theme: {
      accent: "#111111",
      accentInk: "#111111",
      paper: "#FFFFFF",
      paperDeep: "#F4F4F4",
      ink: "#1A1A1A",
      inkStrong: "#000000",
      line: "#E0E0E0",
      muted: "#666666",
      heading: "sans",
      radius: 14,
      fontSize: 16,
    },
  },
];

export const DEFAULT_THEME: Theme = THEME_PRESETS[0].theme;

/** 충돌하지 않는 짧은 id — 문서 안에서만 유일하면 된다 */
export function newId(prefix = "s"): string {
  return `${prefix}${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 6)}`;
}

const BASE = (name: string): SectionBase => ({
  id: newId(),
  name,
  background: { kind: "none" },
  padding: "lg",
  width: "normal",
  align: "left",
  scheme: "light",
});

/** 구역을 새로 하나 만든다 — 빈 껍데기가 아니라 바로 보기 좋은 예시가 들어간다 */
export function newSection(kind: SectionKind): Section {
  switch (kind) {
    case "header":
      return {
        ...BASE("상단 메뉴"),
        kind,
        padding: "sm",
        width: "wide",
        logo: "브랜드 이름",
        sub: "BRAND",
        logoImage: "",
        logoHeight: 34,
        menu: [{ label: "회사소개" }, { label: "서비스" }, { label: "공지사항" }, { label: "문의" }],
        cta: "상담 신청",
      };
    case "hero":
      return {
        ...BASE("히어로"),
        kind,
        padding: "xl",
        scheme: "dark",
        background: { kind: "gradient", from: BRAND_COLORS.deep, to: "#123A63", angle: 160 },
        eyebrow: "ABOUT US",
        title: "한 줄로 각인되는",
        titleEm: "핵심 메시지",
        desc: "무엇을 하는 회사인지, 왜 당신에게 필요한지를 두세 문장으로 설명합니다.",
        primary: "상담 신청",
        secondary: "회사 소개",
        stats: [
          { value: "○○년", label: "업력" },
          { value: "○○건", label: "수행 실적" },
          { value: "○개", label: "전문 분야" },
        ],
      };
    case "cards":
      return {
        ...BASE("카드 그리드"),
        kind,
        eyebrow: "SERVICES",
        title: "주요 업무",
        lead: "제공하는 서비스를 한눈에 보여 주는 구역입니다.",
        columns: 3,
        cards: [1, 2, 3].map((n) => ({
          no: String(n).padStart(2, "0"),
          title: `서비스 ${n}`,
          en: `SERVICE ${n}`,
          desc: "이 서비스가 고객의 어떤 문제를 푸는지 한두 문장으로 적습니다.",
          meta: "자세히 보기",
          image: "",
        })),
      };
    case "steps":
      return {
        ...BASE("단계 흐름"),
        kind,
        eyebrow: "PROCESS",
        title: "진행 절차",
        lead: "문의부터 완료까지 어떻게 흘러가는지 보여 줍니다.",
        steps: [
          { index: "STEP 01", name: "문의 접수", desc: "상담 신청을 남기시면 담당자가 연락드립니다.", gate: false },
          { index: "STEP 02", name: "검토·제안", desc: "요건을 검토하고 방향과 일정을 제안합니다.", gate: false },
          { index: "STEP 03", name: "계약", desc: "조건을 확정하고 계약을 체결합니다.", gate: true },
          { index: "STEP 04", name: "수행·완료", desc: "합의한 일정에 따라 수행하고 결과를 보고합니다.", gate: false },
        ],
      };
    case "table":
      return {
        ...BASE("비교표"),
        kind,
        eyebrow: "PLANS",
        title: "제공 범위",
        lead: "등급이나 요금제별로 무엇이 열리는지 비교합니다.",
        columns: ["기본", "표준", "프리미엄"],
        rows: [
          { label: "기본 상담", cells: ["O", "O", "O"] },
          { label: "정기 리포트", cells: ["X", "O", "O"] },
          { label: "전담 담당자", cells: ["X", "X", "O"] },
        ],
      };
    case "list":
      return {
        ...BASE("목록"),
        kind,
        eyebrow: "CURRICULUM",
        title: "세부 주제",
        lead: "번호가 붙는 목록으로 항목을 정리합니다.",
        items: [1, 2, 3, 4].map((n) => ({
          no: String(n).padStart(2, "0"),
          label: `주제 ${n} — 다루는 내용을 한 줄로`,
          meta: "",
          tags: ["기본", "심화"],
        })),
      };
    case "gallery":
      return {
        ...BASE("이미지 갤러리"),
        kind,
        eyebrow: "GALLERY",
        title: "현장 사진",
        lead: "이미지를 격자로 배치합니다. 사진을 올리거나 주소를 붙여 넣으세요.",
        columns: 3,
        images: [
          { url: "", caption: "사진 설명 1" },
          { url: "", caption: "사진 설명 2" },
          { url: "", caption: "사진 설명 3" },
        ],
      };
    case "rich":
      return {
        ...BASE("글 구역"),
        kind,
        width: "narrow",
        eyebrow: "ABOUT",
        title: "회사 소개",
        body:
          "여기에 본문을 씁니다. 줄을 바꾸면 문단이 나뉩니다.\n\n두 번째 문단입니다. 연혁·철학·인사말처럼 긴 글을 담는 자리입니다.",
      };
    case "cta":
      return {
        ...BASE("강조 배너"),
        kind,
        padding: "lg",
        align: "center",
        scheme: "dark",
        background: { kind: "solid", color: BRAND_COLORS.deep },
        title: "지금 상담을 신청하세요",
        desc: "담당자가 영업일 기준 1일 이내에 연락드립니다.",
        button: "상담 신청",
        note: "· 상담은 무료이며 비밀이 보장됩니다",
      };
    case "board":
      return {
        ...BASE("게시판"),
        kind,
        eyebrow: "BOARD",
        title: "공지사항",
        lead: "새 소식과 자료를 올리는 게시판입니다.",
        boardKey: newId("b"),
        pageSize: 8,
        allowWrite: true,
        posts: [
          {
            id: newId("p"),
            title: "홈페이지를 새로 열었습니다",
            author: "관리자",
            date: "2026-09-01",
            body: "새 홈페이지를 공개했습니다. 앞으로 이곳에서 소식을 전해 드리겠습니다.",
            notice: true,
          },
          {
            id: newId("p"),
            title: "추석 연휴 상담 안내",
            author: "관리자",
            date: "2026-09-03",
            body: "연휴 기간에는 접수만 받고, 회신은 연휴 다음 영업일에 순차적으로 드립니다.",
            notice: false,
          },
        ],
      };
    case "footer":
      return {
        ...BASE("푸터"),
        kind,
        padding: "md",
        scheme: "dark",
        background: { kind: "solid", color: BRAND_COLORS.deep },
        brand: "브랜드 이름",
        lines: ["서울특별시 ○○구 ○○로 00, 0층", "대표전화 02-000-0000 · 사업자등록번호 000-00-00000"],
        links: [{ label: "개인정보처리방침" }, { label: "이용약관" }, { label: "오시는 길" }],
      };
  }
}
