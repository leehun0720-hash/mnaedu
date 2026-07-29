import { pgTable, serial, text, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";

/**
 * Questions authored by the chairman in /admin.
 *
 * `answer` and `intent` are never sent to the public page: the site's premise
 * is that the model answer is withheld and the reader is judged on how far
 * they get without it.
 */
export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    /** One of the five programmes; stores the slug from COURSES */
    track: text("track").notNull(),
    /** 초급 | 중급 | 상급 */
    level: text("level").notNull(),
    /** 주관식 | 객관식 */
    format: text("format").notNull(),
    prompt: text("prompt").notNull(),
    /** Present only for 객관식; ordered option strings */
    choices: jsonb("choices").$type<string[]>(),
    /** Withheld from the public page */
    answer: text("answer"),
    /** Withheld: what the question is really testing */
    intent: text("intent"),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("questions_published_idx").on(t.published, t.createdAt)]
);

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
