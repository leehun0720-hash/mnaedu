import { NextResponse } from "next/server";

/**
 * 관리자 API가 데이터베이스 때문에 넘어졌을 때 돌려줄 답.
 *
 * 처리기가 그냥 던지면 Next.js는 HTML 오류 쪽을 돌려주고, 화면은 그것을
 * JSON으로 읽으려다 조용히 멎는다 — 회장님 화면에서는 "저장 중…"만 남는다.
 * 그래서 어떤 실패든 JSON 한 줄로 바꾸어, 무엇이 잘못됐는지 화면에 뜨게 한다.
 */
export function storageFailure(err: unknown, what: string): NextResponse {
  console.error(`[admin] ${what} failed:`, err);
  const detail = err instanceof Error ? err.message : String(err);
  // 42P01 = undefined_table. setup.sql을 아직 돌리지 않으신 경우다.
  const missingTable = /42P01|does not exist/i.test(detail);
  return NextResponse.json(
    {
      error: missingTable
        ? "데이터베이스에 표가 아직 없습니다. SUPABASE.md의 setup.sql을 한 번 실행해 주십시오."
        : "데이터베이스가 응답하지 않아 처리하지 못했습니다. 잠시 후 다시 시도해 주십시오.",
    },
    { status: 500 }
  );
}

/** 본문이 JSON이 아닐 때 500 대신 400으로 끝낸다 */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
