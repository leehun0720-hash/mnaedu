-- 칼럼을 웹 글로 발행한다.
--
-- 자료실(documents)에 .docx로 얹는 방식으로는 검색엔진이 본문을 읽지 못해,
-- 아주경제 연재 100여 회가 브랜드 검색 자산이 되지 않았다. 본문을 평문으로
-- 받아 /insights/<slug> 페이지로 세운다.
--
-- body는 평문이다(HTML 아님). 화면에서 빈 줄 기준으로 문단만 나눈다.

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
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "articles_slug_idx" ON "articles" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_published_idx" ON "articles" USING btree ("published","published_on");
--> statement-breakpoint
-- 공개 페이지는 익명 키로 읽지 않고 서버에서만 조회하므로, 클라이언트에서
-- 직접 접근하는 경로는 열지 않는다 (다른 표와 같은 방침).
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;
