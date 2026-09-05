-- ㈜프론티어 M&A — Supabase 최초 설정
--
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하십시오.
-- 여러 번 실행해도 안전합니다 (IF NOT EXISTS).
--
-- drizzle/ 의 마이그레이션을 합치고, Supabase에서 반드시 필요한
-- 접근 차단(아래 2부)을 더한 것입니다.

-- ─────────────────────────────────────────────────────────────
-- 1부. 테이블
-- ─────────────────────────────────────────────────────────────

-- 실무 문제.
--   prompt·choices 는 누구나 본다.
--   answer·explanation 은 로그인한 회원에게만, /api/answer 로만 나간다.
--   intent 는 옛 앱에서 "비공개"를 전제로 쓴 메모라 어디로도 나가지 않는다.
-- 난이도(레벨) 열은 없다 — 레벨 체계를 폐지했다.
CREATE TABLE IF NOT EXISTS "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"format" text NOT NULL,
	"prompt" text NOT NULL,
	"choices" jsonb,
	"answer" text,
	"explanation" text,
	"intent" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "questions_published_idx"
	ON "questions" USING btree ("published","created_at");

-- 자료실. 파일 본문은 content 에 base64 로 담는다 — 스토리지 버킷과
-- 서비스 키를 새로 만들지 않기 위한 선택이다(올리는 사람이 한 명, 규모가 작음).
CREATE TABLE IF NOT EXISTS "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"track" text,
	"kind" text DEFAULT '자료' NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "documents_published_idx"
	ON "documents" USING btree ("published","created_at");

-- 칼럼. 자료실이 "내려받는 파일"이라면 이쪽은 "읽히고 검색에 잡히는 글"이다.
-- .docx 는 검색엔진이 본문을 읽지 못해 브랜드 검색 자산이 되지 않으므로,
-- 본문을 평문으로 받아 /insights/<slug> 페이지로 세운다.
CREATE TABLE IF NOT EXISTS "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"lede" text,
	"body" text NOT NULL,
	"source" text,
	"published_on" timestamp with time zone,
	"track" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "articles_slug_idx"
	ON "articles" USING btree ("slug");

CREATE INDEX IF NOT EXISTS "articles_published_idx"
	ON "articles" USING btree ("published","published_on");

-- 회원. 신원은 Supabase Auth 가 맡고 여기에는 이름만 둔다.
-- 등급도 포인트도 결제도 없다 — 가입의 목적은 정답과 해설을 여는 것 하나다.
CREATE TABLE IF NOT EXISTS "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "members_auth_id_idx"
	ON "members" USING btree ("auth_id");

-- 관리자 로그인 실패 기록 (무차별 대입 차단).
-- 서버리스에서는 요청마다 다른 인스턴스가 뜨므로 메모리 카운터도, 응답을
-- 늦추는 것도 소용이 없다. 세는 곳은 모든 인스턴스가 공유하는 DB여야 한다.
CREATE TABLE IF NOT EXISTS "admin_login_attempts" (
	"ip" text PRIMARY KEY NOT NULL,
	"fails" integer DEFAULT 0 NOT NULL,
	"first_fail_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone
);

-- ─────────────────────────────────────────────────────────────
-- 2부. 접근 차단 — 이 부분을 건너뛰면 안 됩니다
-- ─────────────────────────────────────────────────────────────
--
-- Supabase는 public 스키마의 테이블을 자동 생성 REST API(PostgREST)로 노출하고,
-- 브라우저에 나가는 anon 키로 접근할 수 있게 합니다. 그대로 두면 누구나
-- questions 테이블의 answer·explanation 을 직접 읽어갑니다 — 정답과 해설을
-- 공개 데이터에서 원천 배제한다는 원칙이 무너집니다.
--
-- 이 웹사이트는 PostgREST를 전혀 쓰지 않습니다. 서버가 직접 Postgres에
-- 연결(POSTGRES_URL)하므로, 아래처럼 잠가도 애플리케이션은 그대로 동작합니다.

-- RLS를 켜고 정책을 하나도 두지 않으면 anon·authenticated 는 아무 행도 못 봅니다.
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_login_attempts" ENABLE ROW LEVEL SECURITY;

-- 권한 자체도 회수합니다 (이중 방어).
REVOKE ALL ON TABLE "questions" FROM anon, authenticated;
REVOKE ALL ON TABLE "documents" FROM anon, authenticated;
REVOKE ALL ON TABLE "members" FROM anon, authenticated;
REVOKE ALL ON TABLE "admin_login_attempts" FROM anon, authenticated;

-- 앞으로 만들어질 테이블에도 같은 기본값을 적용합니다.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 확인
-- ─────────────────────────────────────────────────────────────
-- 아래를 실행하면 네 테이블 모두 rowsecurity = true 여야 합니다.
--
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY tablename;
--
-- 이미 옛 구조(레벨·포인트·결제)로 만들어 두셨다면,
-- drizzle/0005_brand_page.sql 을 실행해 전환하십시오.
