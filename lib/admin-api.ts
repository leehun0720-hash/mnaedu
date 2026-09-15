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

/**
 * 데이터베이스 일 하나에 허락하는 시간.
 *
 * 화면은 30초를 기다리다 스스로 끊는다. 그보다 먼저 서버가 답해야, 회장님이
 * "서버가 응답하지 않습니다"라는 막연한 말 대신 무엇이 막혔는지를 보신다.
 */
const QUERY_DEADLINE_MS = 12_000;

const TIMED_OUT = Symbol("timed-out");

/**
 * 조회 하나를 시한 안에서 돌린다.
 *
 * 돌아오는 값은 둘 중 하나다 — 결과이거나, 그대로 돌려보낼 응답이거나.
 * 시한을 넘긴 것과 실패한 것을 다른 문장으로 구분한다. 둘을 뭉뚱그리면
 * "데이터베이스가 느린 것"과 "표가 없는 것"을 화면에서 가려낼 수 없다.
 */
export async function runQuery<T>(
  work: Promise<T>,
  label: string,
  ms: number = QUERY_DEADLINE_MS
): Promise<{ ok: true; value: T } | { ok: false; response: NextResponse }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bell = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });

  try {
    const out = await Promise.race([work, bell]);
    if (out === TIMED_OUT) {
      console.error(`[admin] ${label} exceeded ${ms}ms`);
      // 시한 뒤에 실패하더라도 그 거절이 떠돌지 않게 받아 둔다
      void work.catch(() => undefined);
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `데이터베이스가 ${Math.round(ms / 1000)}초 안에 답하지 않았습니다 (${label}). 잠시 후 다시 시도해 주시고, 반복되면 알려 주십시오.`,
          },
          { status: 504 }
        ),
      };
    }
    return { ok: true, value: out as T };
  } catch (err) {
    return { ok: false, response: storageFailure(err, label) };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** 본문이 JSON이 아닐 때 500 대신 400으로 끝낸다 */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
