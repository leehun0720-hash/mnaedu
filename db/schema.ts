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
 * 회장이 /admin에서 직접 쓰는 실무 문제.
 *
 * 난이도(레벨)도, 채점도, 포인트도 없다. 문제는 올라가는 사다리가 아니라
 * 회사가 어느 수준에서 일하는지 보여 주는 한 장의 증거다 — 잘 만든 문제를
 * 보고 "이 사람에게 맡겨야겠다"에 이르게 하는 것이 유일한 역할이다.
 *
 * 문제 본문은 누구나 본다. `answer`·`explanation`은 공개 데이터에 실리지
 * 않고, 로그인한 회원에게만 별도 요청으로 나간다.
 */
export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    /** 5분야 중 하나 — lib/company.ts의 slug */
    track: text("track").notNull(),
    /** 주관식 | 객관식 */
    format: text("format").notNull(),
    prompt: text("prompt").notNull(),
    /** 객관식에만 있다; 순서 있는 보기 문자열 */
    choices: jsonb("choices").$type<string[]>(),
    /** 회원 전용 */
    answer: text("answer"),
    /** 회원 전용 — 왜 그것이 답인지, 실무에서 무엇이 갈리는지 */
    explanation: text("explanation"),
    /**
     * 레거시. 옛 앱에서 "비공개"를 전제로 쓰던 출제 의도 메모다. 회원에게
     * 보이는 explanation으로 자동 전환하면 작성 당시의 전제가 깨지므로,
     * 데이터는 남기되 어디로도 내보내지 않는다. 관리자 화면에서만 참고용으로
     * 보여 주고, 공개할 내용은 회장이 직접 explanation에 옮긴다.
     */
    intent: text("intent"),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("questions_published_idx").on(t.published, t.createdAt)]
);

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

/**
 * 자료실 — 회장이 워드 문서를 올리면 그대로 목록에 선다.
 *
 * 파일 자체는 Supabase Storage에 두고 여기에는 위치와 설명만 둔다. 올리는
 * 사람이 회장 한 명뿐이라 승인 절차도, 작성자 필드도 두지 않는다.
 */
export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    /** 목록에 함께 보이는 한 줄 설명 */
    summary: text("summary"),
    /** 5분야 중 하나 — 비워 두면 분류 없음 */
    track: text("track"),
    /** 자료 | 칼럼 */
    kind: text("kind").notNull().default("자료"),
    /** 내려받을 때 보여 줄 원래 파일 이름 */
    fileName: text("file_name").notNull(),
    /** Content-Type — 내려받기 응답 헤더에 그대로 쓴다 */
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    /** 바이트 — 목록에 크기를 적어 준다 */
    fileSize: integer("file_size").notNull().default(0),
    /**
     * 파일 본문.
     *
     * Storage 버킷을 따로 두지 않고 여기 담는다 — 올리는 사람이 회장 한
     * 명이고 워드 문서 수십 건 규모라, 버킷·RLS 정책·서비스 키를 새로
     * 만드는 대가가 이득보다 크다. 목록 조회는 이 열을 절대 선택하지
     * 않으므로 큰 값이 오가지 않는다.
     */
    content: text("content").notNull(),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_published_idx").on(t.published, t.createdAt)]
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

/**
 * 칼럼 — 회장이 붙여넣으면 그대로 웹 글이 된다.
 *
 * 자료실(documents)과 나누는 이유는 하나다: 자료실은 내려받는 파일이고
 * 칼럼은 **읽히고 검색에 잡혀야 하는 글**이다. .docx는 검색엔진이 사실상
 * 읽지 못하므로, 아주경제 연재 100여 회를 자료실에 얹으면 브랜드 검색
 * 자산이 되지 않는다. 그래서 본문을 텍스트로 받아 페이지로 세운다.
 *
 * 본문은 HTML이 아니라 평문이다. 화면에서 빈 줄 기준으로 문단만 나눠 그리고
 * 태그는 해석하지 않는다 — 붙여넣기 한 번으로 끝내려면 서식을 지원하지
 * 않는 편이 낫고, 남의 마크업을 그대로 실을 일도 없어진다.
 */
export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    /** 주소에 쓰이는 이름. 제목에서 한 번 만들어 두고 이후 바꾸지 않는다 */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** 목록과 검색 설명에 쓰는 한두 문장. 비우면 본문 앞부분을 쓴다 */
    lede: text("lede"),
    /** 평문. 빈 줄이 문단 구분이다 */
    body: text("body").notNull(),
    /** 게재처 — 예: 아주경제 */
    source: text("source"),
    /** 원문이 실린 날. 지난 연재를 옮길 때 이 날짜로 줄 세운다 */
    publishedOn: timestamp("published_on", { withTimezone: true }),
    /** 5분야 중 하나 — 비우면 분류 없음 */
    track: text("track"),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("articles_slug_idx").on(t.slug),
    index("articles_published_idx").on(t.published, t.publishedOn),
  ]
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

/**
 * 회원.
 *
 * 신원(이메일·비밀번호·인증)은 Supabase Auth가 맡고 여기에는 이름만 둔다.
 * 등급도 포인트도 결제도 없다 — 가입의 목적은 정답과 해설을 여는 것,
 * 그리고 누가 보고 있는지 아는 것 하나다.
 */
export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    /** Supabase auth.users.id (UUID 문자열) */
    authId: text("auth_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("members_auth_id_idx").on(t.authId)]
);

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;

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
