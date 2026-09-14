-- 단계(기초·심화). 한 분야 안에서 자료와 문제를 나눠 세우기 위한 표시다.
-- 폐지한 '레벨'과는 다르다 — 점수도 승급도 없고, 어디부터 보시면 되는지만 알린다.
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "stage" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "stage" text;
