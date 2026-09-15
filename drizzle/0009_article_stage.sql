-- 칼럼도 분야별 자료실에 함께 선다. 단계(기초·심화)를 자료·문제와 맞춘다.
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "stage" text;
