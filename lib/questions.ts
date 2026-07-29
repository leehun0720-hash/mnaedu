import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions } from "@/db/schema";

export const COURSES = [
  { slug: "friendly", label: "우호적 M&A" },
  { slug: "hostile", label: "적대적 M&A" },
  { slug: "control", label: "경영권 투자" },
  { slug: "family", label: "패밀리오피스" },
  { slug: "club", label: "투자클럽 운영" },
] as const;

export const LEVELS = ["초급", "중급", "상급"] as const;
export const FORMATS = ["주관식", "객관식"] as const;

export type Level = (typeof LEVELS)[number];
export type Format = (typeof FORMATS)[number];

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

const LEVEL_CLASS: Record<string, string> = {
  초급: "level-elementary",
  중급: "level-intermediate",
  상급: "level-advanced",
};

export function levelClass(level: string): string {
  return LEVEL_CLASS[level] ?? "level-intermediate";
}

export function courseLabel(slug: string): string {
  return COURSES.find((c) => c.slug === slug)?.label ?? slug;
}

/**
 * Shown until the chairman has published anything of his own. Keeping these
 * means the page never renders an empty gate section, including on the very
 * first deploy before a database exists.
 */
export const SEED_QUESTIONS: PublicQuestion[] = [
  {
    no: 1,
    trackLabel: "우호적 M&A",
    level: "중급",
    levelClass: "level-intermediate",
    type: "주관식",
    prompt:
      "M&A를 활용한 외적 성장(Buy)이 내적 성장(Build) 대비 갖는 장점 5가지를 설명하고, 각 장점이 실전에서 무너지는 조건을 함께 제시하십시오.",
  },
  {
    no: 2,
    trackLabel: "적대적 M&A",
    level: "상급",
    levelClass: "level-advanced",
    type: "주관식",
    prompt:
      "대상회사가 포이즌필을 발동한 상황에서 이를 무력화할 법적·전술적 논거를 구성하고, 백기사 연대가 형성될 경우의 대응 시나리오를 서술하십시오.",
  },
  {
    no: 3,
    trackLabel: "경영권 투자",
    level: "초급",
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
      level: r.level,
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
