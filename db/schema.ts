import { pgTable, serial, text, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Practice questions the chairman writes in /admin.
 *
 * There is no difficulty level: questions are a single pool that demonstrates
 * how the firm thinks, not a ladder anyone climbs. The answer and its
 * explanation are the membership benefit — they are served only to a signed-in
 * member, never in the payload that renders the public page.
 */
export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    /** One of the practice areas; stores the slug from TRACKS */
    track: text("track").notNull(),
    /** 주관식 | 객관식 */
    format: text("format").notNull(),
    prompt: text("prompt").notNull(),
    /** Present only for 객관식; ordered option strings */
    choices: jsonb("choices").$type<string[]>(),
    /** Members only */
    answer: text("answer"),
    /** Members only: why that is the answer, and what separates practitioners */
    explanation: text("explanation"),
    /**
     * Legacy. Written under the old app's promise that it would never be
     * shown to anyone, so it is kept but never served — not to the public
     * page and not through the members' answer endpoint. The admin console
     * surfaces it read-only so the chairman can decide what, if anything,
     * belongs in `explanation`.
     */
    intent: text("intent"),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("questions_published_idx").on(t.published, t.createdAt)]
);

/**
 * Someone who registered to read the answers. Membership is free — it exists
 * to turn an anonymous reader into a known contact, not to charge anyone.
 * There is no tier, no grade and no payment attached to this row.
 */
export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    /** Stored lowercased; the unique index is what prevents duplicates */
    email: text("email").notNull(),
    /** pbkdf2$<iterations>$<salt>$<hash> — never a plain password */
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    /** Optional: helps the firm recognise who is reading */
    company: text("company"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("members_email_idx").on(t.email)]
);

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
