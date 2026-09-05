-- 브랜드 페이지로의 전환 (2026-09 조인 미팅 반영).
--
-- 레벨·채점·포인트·등급·결제를 걷어내고 자료실을 들인다.
-- 지우는 것과 더하는 것을 나눠 두었다 — 아래 [A]는 그대로 실행해도 안전하고,
-- [B]는 데이터가 사라지므로 내용을 확인한 뒤 실행하십시오.

-- ═══════════════════════════════════════════════════════════════════
-- [A] 안전 — 더하고, 안 쓰는 열만 비운다
-- ═══════════════════════════════════════════════════════════════════

-- 자료실. 파일 본문은 content에 base64로 담는다 (버킷·서비스 키를 따로 두지
-- 않기 위한 선택 — 올리는 사람이 회장 한 명이고 규모가 작다).
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_published_idx" ON "documents" USING btree ("published","created_at");
--> statement-breakpoint

-- 레벨 체계 폐지. 값("입문"·"상급" 등)은 체계가 사라진 이상 의미가 없다.
ALTER TABLE "questions" DROP COLUMN IF EXISTS "level";
--> statement-breakpoint

-- 등급·포인트·구독 폐지. 회원에게 남는 것은 신원뿐이다.
ALTER TABLE "members" DROP COLUMN IF EXISTS "tier";
--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN IF EXISTS "points";
--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN IF EXISTS "cleared_level";
--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN IF EXISTS "paid_until";

-- ═══════════════════════════════════════════════════════════════════
-- [B] 데이터가 사라짐 — 내용을 확인한 뒤 실행하십시오
--
--   먼저 무엇이 들어 있는지 보십시오:
--     SELECT count(*) FROM answers;
--     SELECT count(*) FROM point_ledger;
--     SELECT count(*) FROM orders;
--     SELECT count(*) FROM unlocked_explanations;
--
--   시험용 데이터뿐이라면 아래 네 줄의 주석을 풀어 실행하십시오.
--   남겨 두어도 앱은 이 표들을 읽지도 쓰지도 않으므로 문제되지 않습니다.
-- ═══════════════════════════════════════════════════════════════════

-- DROP TABLE IF EXISTS "answers";
-- DROP TABLE IF EXISTS "point_ledger";
-- DROP TABLE IF EXISTS "unlocked_explanations";
-- DROP TABLE IF EXISTS "orders";
