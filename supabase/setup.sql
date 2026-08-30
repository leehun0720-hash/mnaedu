-- ㈜프론티어 M&A — Supabase 최초 설정
--
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하십시오.
-- 여러 번 실행해도 안전합니다 (IF NOT EXISTS).
--
-- drizzle/0000~0002_*.sql 을 합치고, Supabase에서 반드시 필요한
-- 접근 차단(아래 2부)을 더한 것입니다.

-- ─────────────────────────────────────────────────────────────
-- 1부. 테이블
-- ─────────────────────────────────────────────────────────────

-- 문제. answer · intent · explanation 은 공개 페이지로 절대 나가지 않는다.
CREATE TABLE IF NOT EXISTS "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"level" text NOT NULL,
	"format" text NOT NULL,
	"prompt" text NOT NULL,
	"choices" jsonb,
	"answer" text,
	"intent" text,
	"explanation" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "explanation" text;
CREATE INDEX IF NOT EXISTS "questions_published_idx"
	ON "questions" USING btree ("published","created_at");

-- 아카데미 회원. 신원은 Supabase Auth가 갖고, 여기에는 등급·포인트만 둔다.
CREATE TABLE IF NOT EXISTS "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"tier" text DEFAULT 'free' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"cleared_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "members_auth_id_idx"
	ON "members" USING btree ("auth_id");

-- 포인트 원장. 잔액만 두면 증감을 설명할 수 없어 건별로 남긴다.
CREATE TABLE IF NOT EXISTS "point_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"kind" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "point_ledger_member_idx"
	ON "point_ledger" USING btree ("member_id","created_at");

-- 열어 본 해설. 한 번 낸 포인트로 계속 볼 수 있어야 하므로 따로 기록한다.
CREATE TABLE IF NOT EXISTS "unlocked_explanations" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "unlocked_member_question_idx"
	ON "unlocked_explanations" USING btree ("member_id","question_id");


-- 답안. 한 문제 한 번 제출 — 객관식은 자동, 주관식은 회장/AI 채점.
CREATE TABLE IF NOT EXISTS "answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"body" text NOT NULL,
	"choice_index" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"score" integer,
	"graded_by" text,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"graded_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "answers_member_question_idx" ON "answers" USING btree ("member_id","question_id");
CREATE INDEX IF NOT EXISTS "answers_status_idx" ON "answers" USING btree ("status","created_at");


-- 유료 전환 주문. PG 연결 전에는 관리자가 승인해 구독을 연다.
CREATE TABLE IF NOT EXISTS "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"member_id" integer NOT NULL,
	"plan_code" text NOT NULL,
	"plan_name" text NOT NULL,
	"amount" integer NOT NULL,
	"days" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"provider_key" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_id_idx" ON "orders" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "orders_member_idx" ON "orders" USING btree ("member_id","created_at");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" USING btree ("status","created_at");

-- 구독 만료일. null이면 기한 없음(관리자가 직접 올린 계정).
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "paid_until" timestamp with time zone;

-- ─────────────────────────────────────────────────────────────
-- 2부. 접근 차단 — 이 부분을 건너뛰면 안 됩니다
-- ─────────────────────────────────────────────────────────────
--
-- Supabase는 public 스키마의 테이블을 자동 생성 REST API(PostgREST)로 노출하고,
-- 브라우저에 나가는 anon 키로 접근할 수 있게 합니다. 그대로 두면 누구나
-- questions 테이블의 answer·explanation 을 직접 읽어갑니다 — 정답과 회장 해설을
-- 공개 데이터에서 원천 배제한다는 원칙이 무너집니다.
--
-- 이 웹사이트는 PostgREST를 전혀 쓰지 않습니다. 서버가 직접 Postgres에
-- 연결(POSTGRES_URL)하므로, 아래처럼 잠가도 애플리케이션은 그대로 동작합니다.

-- RLS를 켜고 정책을 하나도 두지 않으면 anon·authenticated 는 아무 행도 못 봅니다.
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "point_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unlocked_explanations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;

-- 권한 자체도 회수합니다 (이중 방어).
REVOKE ALL ON TABLE "questions" FROM anon, authenticated;
REVOKE ALL ON TABLE "members" FROM anon, authenticated;
REVOKE ALL ON TABLE "point_ledger" FROM anon, authenticated;
REVOKE ALL ON TABLE "unlocked_explanations" FROM anon, authenticated;
REVOKE ALL ON TABLE "answers" FROM anon, authenticated;
REVOKE ALL ON TABLE "orders" FROM anon, authenticated;

-- 앞으로 만들어질 테이블에도 같은 기본값을 적용합니다.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 확인
-- ─────────────────────────────────────────────────────────────
-- 아래를 실행하면 네 테이블 모두 rowsecurity = true 여야 합니다.
--
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY tablename;
