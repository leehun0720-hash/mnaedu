-- 관리자가 비밀번호를 직접 바꾼다.
--
-- 지금까지 비밀번호는 배포 설정(ADMIN_PASSWORD)에만 있었다. 저장소가 공개되어
-- 있어 코드에 둘 수 없었기 때문인데, 그 때문에 회장이 스스로 바꾸실 수가
-- 없었다(Vercel 설정에 들어가 값을 고치고 재배포해야 했다).
--
-- 해시만 담는 표를 두고, 한 번이라도 바꾸시면 그때부터 이 값이 기준이 된다.
-- 환경변수는 처음 문을 여는 열쇠로 남는다. 행은 하나뿐이라 id를 1로 고정한다.
CREATE TABLE IF NOT EXISTS "admin_credentials" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"password_hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- 비밀번호 해시가 담기므로 공개 키로는 한 행도 볼 수 없어야 한다
ALTER TABLE "admin_credentials" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "admin_credentials" FROM anon, authenticated;
