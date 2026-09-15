import { NextResponse } from "next/server";

/**
 * 관리자 API가 데이터베이스 때문에 넘어졌을 때 돌려줄 답.
 *
 * 처리기가 그냥 던지면 Next.js는 HTML 오류 쪽을 돌려주고, 화면은 그것을
 * JSON으로 읽으려다 조용히 멎는다 — 회장님 화면에서는 "저장 중…"만 남는다.
 * 그래서 어떤 실패든 JSON 한 줄로 바꾸어, 무엇이 잘못됐는지 화면에 뜨게 한다.
 */
/**
 * 드라이버는 진짜 이유를 겉이 아니라 cause 안에 넣어 둔다.
 * 겉만 보면 "Failed query: select …" 뿐이라, 무엇이 없어서 실패했는지 놓친다.
 */
function detailOf(err: unknown, depth = 0): string {
  if (depth > 4 || !err) return "";
  if (err instanceof Error) {
    return `${err.message} ${detailOf((err as { cause?: unknown }).cause, depth + 1)}`;
  }
  return String(err);
}

export function storageFailure(err: unknown, what: string): NextResponse {
  console.error(`[admin] ${what} failed:`, err);
  const detail = detailOf(err);
  // 42P01 = 표가 없음, 42703 = 열이 없음. 둘 다 setup.sql을 아직 안 돌리신 경우다.
  const needsSetup = /42P01|42703|does not exist/i.test(detail);
  return NextResponse.json(
    {
      error: needsSetup
        ? "데이터베이스가 아직 최신 모양이 아닙니다. SUPABASE.md의 setup.sql을 한 번 더 실행해 주십시오."
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
