-- 앱 2번(기업 브랜드 페이지)으로의 전환.
--
--  1. level  — 레벨 시스템이 폐지되었으므로 컬럼을 제거한다.
--  2. intent — 제거하지 않는다. "비공개"를 전제로 작성된 출제 의도 메모이므로,
--              회원에게 보이는 explanation 으로 자동 전환하면 작성 당시의 전제를
--              깨뜨린다. 컬럼과 데이터를 그대로 두고 관리자 화면에서 참고용으로만
--              보여준 뒤, 공개 여부는 회장이 직접 판단해 explanation 에 옮긴다.
--  3. explanation — 회원에게 공개되는 해설. 비워둔 채로 시작한다.
--  4. members — 정답을 열람하는 무료 회원. 등급도 결제도 붙지 않는다.

ALTER TABLE "questions" DROP COLUMN IF EXISTS "level";
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "explanation" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "members_email_idx" ON "members" USING btree ("email");
