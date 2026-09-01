import "server-only";

import { and, desc, eq, notInArray } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions } from "@/db/schema";
import { OFFLINE_TRACKS, SEED_QUESTIONS, courseLabel, isOfflineTrack, levelClass, normalizeLevel, type PublicQuestion } from "@/lib/questions";

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
      // 시크릿 오피스 분야는 발행돼 있어도 공개 화면에 오르지 않는다 (블라인드)
      .where(and(eq(questions.published, true), notInArray(questions.track, OFFLINE_TRACKS)))
      .orderBy(desc(questions.createdAt))
      .limit(limit);

    if (rows.length === 0) return SEED_QUESTIONS;

    return rows.map((r, i) => ({
      id: r.id,
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

/** 풀이 화면이 쓰는 문제 전문 — 정답·의도·해설은 여기 실리지 않는다 */
export type QuizQuestion = {
  id: number;
  track: string;
  trackLabel: string;
  level: string;
  levelClass: string;
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
    // 오프라인 전용 분야의 문제는 직접 링크로도 열리지 않는다
    if (!r || !r.published || isOfflineTrack(r.track)) return null;
    return {
      id: r.id,
      track: r.track,
      trackLabel: courseLabel(r.track),
      level: normalizeLevel(r.level),
      levelClass: levelClass(r.level),
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
