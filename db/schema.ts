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
    /**
     * 유료 구독 만료 시각. null이면 기한 없음 — 관리자가 직접 올린 계정
     * (회장·심사용 계정)이 여기 해당한다. 결제로 올라간 계정은 항상 값이 있다.
     */
    paidUntil: timestamp("paid_until", { withTimezone: true }),
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

/**
 * 회원이 제출한 답안과 채점 결과.
 *
 * 한 문제에 한 번만 제출한다(선발 테스트 성격) — (member, question) 유니크.
 * 객관식은 제출 즉시 자동 채점되고, 주관식은 회장 채점(관리자 화면) 또는
 * AI 채점(ANTHROPIC_API_KEY 설정 시)을 거쳐 graded로 바뀐다. 통과(60점↑)하면
 * 포인트가 적립되고 통과 레벨이 올라간다.
 */
export const answers = pgTable(
  "answers",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").notNull(),
    questionId: integer("question_id").notNull(),
    /** 주관식은 서술 본문, 객관식은 고른 보기의 원문 */
    body: text("body").notNull(),
    /** 객관식에서 고른 보기 번호 (0부터) — 주관식은 null */
    choiceIndex: integer("choice_index"),
    /** pending | graded */
    status: text("status").notNull().default("pending"),
    /** 0~100, graded일 때만 존재 */
    score: integer("score"),
    /** auto(객관식) | ai | admin(회장) */
    gradedBy: text("graded_by"),
    /** 채점 강평 — 본인에게만 보인다 */
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("answers_member_question_idx").on(t.memberId, t.questionId),
    index("answers_status_idx").on(t.status, t.createdAt),
  ]
);

export type Answer = typeof answers.$inferSelect;

/**
 * 유료 전환 주문.
 *
 * PG(토스페이먼츠)를 붙이기 전에도 흐름 전체가 돌아야 하므로, 주문은 결제
 * 수단과 분리해 둔다 — 회원이 신청하면 pending으로 쌓이고, 관리자가 승인하면
 * 구독이 열린다. PG를 붙이면 승인 주체만 관리자에서 결제 승인 응답으로
 * 바뀌고 나머지(구독 연장·이력)는 그대로 쓴다.
 */
export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    /** 가맹점 주문번호 — PG에 그대로 넘긴다 (토스: 6~64자, 영숫자 -_) */
    orderId: text("order_id").notNull(),
    memberId: integer("member_id").notNull(),
    /** lib/billing.ts의 요금제 코드 */
    planCode: text("plan_code").notNull(),
    planName: text("plan_name").notNull(),
    /** 원 단위. 승인 시점의 금액을 박아 둔다 — 요금이 바뀌어도 과거 주문은 그대로 */
    amount: integer("amount").notNull(),
    /** 이 주문이 열어 주는 기간(일) */
    days: integer("days").notNull(),
    /** pending | paid | canceled | failed */
    status: text("status").notNull().default("pending"),
    /** manual(관리자 승인) | toss */
    provider: text("provider").notNull().default("manual"),
    /** PG가 준 결제 식별자 — 취소·조회에 쓴다 */
    providerKey: text("provider_key"),
    /** 승인·취소 사유나 메모 */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("orders_order_id_idx").on(t.orderId),
    index("orders_member_idx").on(t.memberId, t.createdAt),
    index("orders_status_idx").on(t.status, t.createdAt),
  ]
);

export type Order = typeof orders.$inferSelect;

/**
 * 관리자 로그인 실패 기록 (무차별 대입 차단).
 *
 * 서버리스에서는 요청마다 다른 인스턴스가 뜨므로 메모리 카운터도, 응답을
 * 늦추는 것도 소용이 없다 — 지연은 한 요청만 붙잡을 뿐, 동시에 백 번
 * 두드리면 총 1초다. 세는 곳은 모든 인스턴스가 공유하는 DB여야 한다.
 */
export const adminLoginAttempts = pgTable("admin_login_attempts", {
  /** 요청 출처. 프록시 뒤이므로 x-forwarded-for의 첫 주소를 쓴다 */
  ip: text("ip").primaryKey(),
  fails: integer("fails").notNull().default(0),
  firstFailAt: timestamp("first_fail_at", { withTimezone: true }).notNull().defaultNow(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
});
