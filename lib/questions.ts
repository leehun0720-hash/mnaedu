import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions } from "@/db/schema";
import { BUSINESS_AREAS } from "@/lib/company";

/**
 * 문제은행 2축 구조 (기획 보고서 4.2).
 *
 * 가로축 = 「업무분야별 카테고리」의 5분야 58주제, 세로축 = 난이도 L1~L5.
 * 가로축은 홈페이지 게시판과 같은 정본을 쓰므로 lib/company.ts에서 가져온다 —
 * 한 문제가 '경영권 분쟁 > 델라웨어 판례 > L5'로 분류되어 두 사이트가 같은
 * 분류 체계를 공유한다.
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

export type LevelCode = "L1" | "L2" | "L3" | "L4" | "L5";

/** 5레벨 승급 체계 (보고서 4.1) — 무료는 L1 하나뿐이다 */
export const LEVEL_TIERS: {
  code: LevelCode;
  name: string;
  access: "무료회원" | "유료회원";
  scope: string;
  authoring: string;
}[] = [
  { code: "L1", name: "입문", access: "무료회원", scope: "용어 · 기본 개념", authoring: "AI 출제 · 아바타 해설" },
  { code: "L2", name: "기본", access: "유료회원", scope: "절차 · 구조 이해", authoring: "AI 출제" },
  { code: "L3", name: "실무", access: "유료회원", scope: "사례 적용", authoring: "AI 초안 + 운영 검토" },
  { code: "L4", name: "상급", access: "유료회원", scope: "실전 판단 · 딜 구조", authoring: "회장 출제 · 검수 없이는 발행 불가" },
  { code: "L5", name: "마스터", access: "유료회원", scope: "델라웨어 판례 · 플레이북 수준", authoring: "회장 전담 출제" },
];

export const LEVELS = LEVEL_TIERS.map((t) => t.name) as unknown as readonly string[];
export const FORMATS = ["주관식", "객관식"] as const;

/** 개편 전 난이도 표기를 5레벨로 잇는다 (상급은 이름이 같아 그대로 통과한다) */
const LEGACY_LEVELS: Record<string, string> = { 초급: "입문", 중급: "실무" };

export type Level = string;
export type Format = (typeof FORMATS)[number];

/** 퀴즈 1건의 문항 수 — 설계서 지시("퀴즈 1개당 3문제") */
export const QUESTIONS_PER_QUIZ = 3;

/** What the public page renders. Answers and intent never appear here. */
export type PublicQuestion = {
  no: number;
  trackLabel: string;
  level: string;
  levelClass: string;
  type: string;
  prompt: string;
  choices?: string[];
};

/** 상위 레벨일수록 짙게 — 태그 색은 세 단계로만 나눈다 */
const LEVEL_CLASS: Record<string, string> = {
  입문: "level-elementary",
  기본: "level-elementary",
  실무: "level-intermediate",
  상급: "level-advanced",
  마스터: "level-advanced",
};

export function normalizeLevel(level: string): string {
  return LEGACY_LEVELS[level] ?? level;
}

export function levelClass(level: string): string {
  return LEVEL_CLASS[normalizeLevel(level)] ?? "level-intermediate";
}

export function levelCode(level: string): LevelCode | undefined {
  return LEVEL_TIERS.find((t) => t.name === normalizeLevel(level))?.code;
}

export function courseLabel(slug: string): string {
  const resolved = LEGACY_TRACKS[slug] ?? slug;
  return COURSES.find((c) => c.slug === resolved)?.label ?? slug;
}

/**
 * Shown until the chairman has published anything of his own. Keeping these
 * means the page never renders an empty gate section, including on the very
 * first deploy before a database exists.
 */
export const SEED_QUESTIONS: PublicQuestion[] = [
  {
    no: 1,
    trackLabel: "M&A 중개",
    level: "실무",
    levelClass: "level-intermediate",
    type: "주관식",
    prompt:
      "M&A를 활용한 외적 성장(Buy)이 내적 성장(Build) 대비 갖는 장점 5가지를 설명하고, 각 장점이 실전에서 무너지는 조건을 함께 제시하십시오.",
  },
  {
    no: 2,
    trackLabel: "경영권 분쟁",
    level: "상급",
    levelClass: "level-advanced",
    type: "주관식",
    prompt:
      "대상회사가 포이즌필을 발동한 상황에서 이를 무력화할 법적·전술적 논거를 구성하고, 백기사 연대가 형성될 경우의 대응 시나리오를 서술하십시오.",
  },
  {
    no: 3,
    trackLabel: "M&A 자금조달",
    level: "입문",
    levelClass: "level-elementary",
    type: "주관식",
    prompt:
      "SPA 가격조정 방식인 Locked-Box와 Closing Accounts의 구조적 차이를 설명하고, 매수인 관점에서 각 방식이 부담하는 리스크를 비교하십시오.",
  },
];

/**
 * Published questions for the public page. Falls back to the seed set when
 * there is no database, or when reading it fails — a storage problem must not
 * take the marketing site down with it.
 */
export async function getPublicQuestions(limit = 3): Promise<PublicQuestion[]> {
  if (!isDbConfigured()) return SEED_QUESTIONS;
  try {
    const rows = await getDb()
      .select()
      .from(questions)
      .where(eq(questions.published, true))
      .orderBy(desc(questions.createdAt))
      .limit(limit);

    if (rows.length === 0) return SEED_QUESTIONS;

    return rows.map((r, i) => ({
      no: i + 1,
      trackLabel: courseLabel(r.track),
      level: normalizeLevel(r.level),
      levelClass: levelClass(r.level),
      type: r.format,
      prompt: r.prompt,
      choices: r.choices ?? undefined,
    }));
  } catch (err) {
    console.error("[questions] falling back to seed set:", err);
    return SEED_QUESTIONS;
  }
}
