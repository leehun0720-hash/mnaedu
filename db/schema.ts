import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Questions authored by the chairman in /admin.
 *
 * `answer`, `intent`, `explanation` are never sent to the public page: the
 * site's premise is that the model answer is withheld and the reader is judged
 * on how far they get without it. 해설은 로그인 + 포인트 차감 화면에서만
 * 열린다 (기획 보고서 4.3 · 8장).
 */
export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    /** 5분야 중 하나 — lib/company.ts의 slug */
    track: text("track").notNull(),
    /** 입문 | 기본 | 실무 | 상급 | 마스터 (L1~L5) */
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
    /** Withheld: 회장 해설 — 포인트를 써야 열린다 */
    explanation: text("explanation"),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("questions_published_idx").on(t.published, t.createdAt)]
);

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

/**
 * 아카데미 회원.
 *
 * 신원(이메일·비밀번호·인증)은 Supabase Auth가 맡고, 여기에는 업무 데이터만
 * 둔다 — 등급과 포인트, 승급 상태. `authId`가 Supabase auth.users의 id다.
 * 개인정보는 최소 수집 원칙에 따라 이름 외에 담지 않는다 (보고서 8장).
 */
export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    /** Supabase auth.users.id (UUID 문자열) */
    authId: text("auth_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    /** free | paid — 유료 전환은 결제 연결 전까지 관리자가 수동으로 올린다 */
    tier: text("tier").notNull().default("free"),
    /** 풀이로 쌓이고 해설을 열 때 차감된다 */
    points: integer("points").notNull().default(0),
    /** 통과한 최고 레벨 (0 = 아직 없음, 5 = 마스터) */
    clearedLevel: integer("cleared_level").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("members_auth_id_idx").on(t.authId)]
);

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;

/**
 * 포인트 원장.
 *
 * 잔액만 두면 왜 늘고 줄었는지 설명할 수 없어, 적립·차감을 건별로 남긴다.
 * 해설 열람은 여기에 기록이 남아야 재열람 시 다시 차감하지 않는다.
 */
export const pointLedger = pgTable(
  "point_ledger",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").notNull(),
    /** earn | spend */
    kind: text("kind").notNull(),
    /** 양수로 저장하고 kind로 방향을 읽는다 */
    amount: integer("amount").notNull(),
    /** 사유 — 'quiz:12' · 'explanation:12' 처럼 대상까지 남긴다 */
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("point_ledger_member_idx").on(t.memberId, t.createdAt)]
);

export type PointEntry = typeof pointLedger.$inferSelect;

/**
 * 열어 본 해설.
 *
 * 한 번 포인트를 낸 해설은 계속 볼 수 있어야 하므로 따로 기록한다.
 */
export const unlockedExplanations = pgTable(
  "unlocked_explanations",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").notNull(),
    questionId: integer("question_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("unlocked_member_question_idx").on(t.memberId, t.questionId)]
);

export type UnlockedExplanation = typeof unlockedExplanations.$inferSelect;
