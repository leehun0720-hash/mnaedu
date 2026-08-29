import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions } from "@/db/schema";
import { SEED_QUESTIONS, courseLabel, levelClass, normalizeLevel, type PublicQuestion } from "@/lib/questions";

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
