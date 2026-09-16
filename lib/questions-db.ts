import "server-only";

import { and, count, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions } from "@/db/schema";
import {
  SEED_QUESTIONS,
  courseLabel,
  normalizeStage,
  normalizeTrack,
  trackAliases,
  type PublicQuestion,
  type Stage,
} from "@/lib/questions";
import { RECRUIT_TRACK } from "@/lib/recruit";

/**
 * 서버 전용 — postgres 드라이버는 Node 소켓을 쓰므로 클라이언트 번들에
 * 들어가면 안 된다. 순수 분류 데이터는 lib/questions.ts에 남아 있다.
 */

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
      // 채용 문제는 업무 목록에 서지 않는다 — 다른 자리에서 다른 목적으로 쓴다
      .where(and(eq(questions.published, true), ne(questions.track, RECRUIT_TRACK)))
      .orderBy(desc(questions.createdAt))
      .limit(limit);

    if (rows.length === 0) return SEED_QUESTIONS;

    return rows.map((r, i) => ({
      id: r.id,
      no: i + 1,
      track: normalizeTrack(r.track),
      trackLabel: courseLabel(r.track),
      type: r.format,
      prompt: r.prompt,
      choices: r.choices ?? undefined,
    }));
  } catch (err) {
    console.error("[questions] falling back to seed set:", err);
    return SEED_QUESTIONS;
  }
}

/** 풀이 화면이 쓰는 문제 전문 — 정답·의도·해설은 여기 실리지 않는다 */
export type QuizQuestion = {
  id: number;
  track: string;
  trackLabel: string;
  format: string;
  prompt: string;
  choices: string[] | null;
  /** 해설이 등록되어 있는지만 알려준다 — 본문은 /api/explanation으로만 나간다 */
  hasExplanation: boolean;
};

export async function getQuizQuestion(id: number): Promise<QuizQuestion | null> {
  if (!isDbConfigured()) return null;
  try {
    const [r] = await getDb()
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);
    // 발행하지 않은 문제는 직접 링크로도 열리지 않는다.
    // 채용 문제도 이 길로는 열지 않는다 — 응시는 /careers 한 곳에서만 한다.
    if (!r || !r.published || r.track === RECRUIT_TRACK) return null;
    return {
      id: r.id,
      track: r.track,
      trackLabel: courseLabel(r.track),
      format: r.format,
      prompt: r.prompt,
      choices: r.choices ?? null,
      hasExplanation: Boolean(r.explanation),
    };
  } catch (err) {
    console.error("[questions] quiz lookup failed:", err);
    return null;
  }
}

/**
 * 한 분야를 거르는 조건. 단계를 주면 그 단계만 남긴다.
 * 분야로 막는 조건은 없다 — 무엇을 세울지는 '발행'이 정한다.
 * 목록과 개수가 같은 조건을 봐야 쪽 번호가 어긋나지 않으므로 한 곳에 둔다.
 */
function trackFilter(slug: string, stage: Stage | null) {
  const where = [eq(questions.published, true), inArray(questions.track, trackAliases(slug))];
  if (stage) where.push(eq(questions.stage, stage));
  return where;
}

/** 한 분야의 평가문제 — 업무 상세 화면이 쓴다. 다섯 분야 모두 같은 규칙이다. */
export async function getQuestionsByTrack(
  slug: string,
  limit = 10,
  offset = 0,
  stage: Stage | null = null
): Promise<PublicQuestion[]> {
  if (!isDbConfigured()) return [];
  try {
    const rows = await getDb()
      .select()
      .from(questions)
      .where(and(...trackFilter(slug, stage)))
      .orderBy(desc(questions.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map((r, i) => ({
      id: r.id,
      no: offset + i + 1,
      track: normalizeTrack(r.track),
      trackLabel: courseLabel(r.track),
      stage: normalizeStage(r.stage) ?? undefined,
      type: r.format,
      prompt: r.prompt,
      choices: r.choices ?? undefined,
    }));
  } catch (err) {
    console.error("[questions] track list failed:", err);
    return [];
  }
}

export async function countQuestionsByTrack(
  slug: string,
  stage: Stage | null = null
): Promise<number> {
  if (!isDbConfigured()) return 0;
  try {
    const [row] = await getDb()
      .select({ value: count() })
      .from(questions)
      .where(and(...trackFilter(slug, stage)));
    return row?.value ?? 0;
  } catch (err) {
    console.error("[questions] track count failed:", err);
    return 0;
  }
}
