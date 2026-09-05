import { BUSINESS_AREAS } from "@/lib/company";

/**
 * 문제은행 분류 (기획 보고서 4.2 · 개편).
 *
 * 분류축은 「업무분야별 카테고리」의 5분야 하나뿐이다. 난이도(레벨) 축은
 * 폐지했다 — 문제는 올라가는 사다리가 아니라, 회사가 어느 수준에서 일하는지
 * 보여 주는 하나의 묶음이기 때문이다. 홈페이지 게시판과 같은 정본을 쓰므로
 * 분야는 lib/company.ts에서 가져온다.
 *
 * 이 파일은 관리자 화면 같은 클라이언트 컴포넌트도 함께 쓰므로 데이터베이스를
 * 건드리지 않는다 — 조회는 lib/questions-db.ts가 맡는다.
 */
export const COURSES = BUSINESS_AREAS.map((b) => ({ slug: b.slug, label: b.name }));

/**
 * 개편 전 슬러그. 이미 저장된 문제가 라벨을 잃지 않도록 새 분야로 잇는다.
 * (경영권 투자는 별도 메뉴 없이 경영권 분쟁에 통합 — 보고서 9장-3 기본안)
 */
const LEGACY_TRACKS: Record<string, string> = {
  friendly: "brokerage",
  hostile: "dispute",
  control: "dispute",
  family: "family-office",
  club: "investor-club",
};

export const FORMATS = ["주관식", "객관식"] as const;
export type Format = (typeof FORMATS)[number];

/** 퀴즈 1건의 문항 수 — 설계서 지시("퀴즈 1개당 3문제") */
export const QUESTIONS_PER_QUIZ = 3;

/** 공개 페이지가 그리는 모양. 정답·해설은 여기 없다. */
export type PublicQuestion = {
  /** DB 문제의 id — 예시(시드) 문제에는 없어서 풀이 화면이 열리지 않는다 */
  id?: number;
  no: number;
  trackLabel: string;
  type: string;
  prompt: string;
  choices?: string[];
};

/** 옛 슬러그를 현행 분야로 옮긴다 — 저장된 값을 그대로 화면에 세우면 선택지에 없다 */
export function normalizeTrack(slug: string): string {
  return LEGACY_TRACKS[slug] ?? slug;
}

/**
 * 시크릿 오피스(패밀리오피스·투자가 클럽)는 오직 오프라인 교육·커뮤니티로만
 * 진행한다 — 문제은행에서는 블라인드다. 발행 여부와 무관하게 공개 목록·풀이·
 * 해설 경로 어디에도 오르지 않는다. 어느 분야가 오프라인 전용인지는 정본
 * (lib/company.ts)의 offlineOnly 표시 한 곳에서만 정한다.
 */
export const OFFLINE_TRACKS: string[] = [
  ...BUSINESS_AREAS.filter((b) => b.offlineOnly).map((b) => b.slug),
  // 옛 슬러그로 저장된 문제도 같은 분야다 — DB 조회는 원문 값으로 거른다
  ...Object.entries(LEGACY_TRACKS)
    .filter(([, target]) => BUSINESS_AREAS.some((b) => b.slug === target && b.offlineOnly))
    .map(([legacy]) => legacy),
];

export function isOfflineTrack(slug: string): boolean {
  return BUSINESS_AREAS.some((b) => b.slug === normalizeTrack(slug) && b.offlineOnly);
}

export function courseLabel(slug: string): string {
  return COURSES.find((c) => c.slug === normalizeTrack(slug))?.label ?? slug;
}

/**
 * 회장이 직접 출제한 문제가 아직 없을 때 대신 세우는 예시.
 * 데이터베이스가 없는 첫 배포에서도 빈 화면이 나오지 않게 한다.
 */
export const SEED_QUESTIONS: PublicQuestion[] = [
  {
    no: 1,
    trackLabel: "M&A 중개",
    type: "주관식",
    prompt:
      "M&A를 활용한 외적 성장(Buy)이 내적 성장(Build) 대비 갖는 장점 5가지를 설명하고, 각 장점이 실전에서 무너지는 조건을 함께 제시하십시오.",
  },
  {
    no: 2,
    trackLabel: "경영권 분쟁",
    type: "주관식",
    prompt:
      "대상회사가 경영권 방어 수단을 발동한 상황에서 이를 다툴 법적·전술적 논거를 구성하고, 백기사 연대가 형성될 경우의 대응 시나리오를 서술하십시오.",
  },
  {
    no: 3,
    trackLabel: "M&A 자금조달",
    type: "주관식",
    prompt:
      "SPA 가격조정 방식인 Locked-Box와 Closing Accounts의 구조적 차이를 설명하고, 매수인 관점에서 각 방식이 부담하는 리스크를 비교하십시오.",
  },
];
