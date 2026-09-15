-- 회원 메모. 오프라인 심사를 거쳐 모임에 들이는 분야가 있어, 누가 어느
-- 자리까지 왔는지 적어 둘 곳이 필요하다. 회원에게는 보이지 않는다.
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "note" text;
