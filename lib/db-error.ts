/**
 * 데이터베이스 오류를 사람이 읽을 수 있는 한 줄로 만든다.
 *
 * Drizzle 은 실패한 질의를 자기 오류로 감싸고 **진짜 원인을 `cause` 에 넣는다.**
 * 겉면만 보면 "Failed query: select …" 까지만 보이고 정작 필요한
 * `relation "articles" does not exist` 는 한 겹 아래에 있다. 그래서 원인을
 * 알아보지 못한 채 "저장 중 문제가 발생했습니다"만 남는 일이 생겼다.
 *
 * 체인을 끝까지 따라가며 메시지와 코드를 모은다.
 */
export function describeDbError(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  const seen = new Set<unknown>();

  // cause 가 자기 자신을 가리키는 경우가 있어 방문한 것을 기억한다
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const e = current as { message?: unknown; code?: unknown; cause?: unknown };
    if (typeof e.message === "string" && e.message) {
      const code = typeof e.code === "string" && e.code ? ` [${e.code}]` : "";
      parts.push(e.message + code);
    }
    current = e.cause;
  }

  if (parts.length === 0) return String(err);
  return parts.join(" | ");
}

/** 표가 아직 만들어지지 않은 상태인가 (Postgres 42P01) */
export function isMissingTable(err: unknown): boolean {
  return /relation .* does not exist|42P01/i.test(describeDbError(err));
}
