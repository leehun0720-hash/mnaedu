/**
 * 기다림에 끝을 두고, 시한을 넘기면 미리 정해 둔 값으로 물러난다.
 *
 * 데이터베이스가 아주 죽지는 않고 느려지기만 할 때가 가장 나쁘다. 드라이버는
 * 연결이 설 때까지 기다리므로(connect_timeout) 한 번 호출에 십수 초가 실리고,
 * 로그인처럼 그런 호출이 줄줄이 이어지는 길목에서는 그 합만큼 화면이 멎는다 —
 * 회장님 쪽에서는 "확인 중…"만 뜨고 아무 일도 일어나지 않는 것으로 보인다.
 *
 * 그래서 곁가지 조회(실패 횟수 세기, 비밀번호 기준 읽기)에는 시한을 둔다.
 * 이들은 원래도 실패하면 물러나도록 만들어져 있으므로, 시한을 넘긴 것과
 * 실패한 것을 같게 다루어도 규칙이 달라지지 않는다. 다만 느려질 뿐이던 것이
 * 이제는 빠르게 물러난다.
 *
 * 시간만 다루는 순수한 도구라 server-only 표시를 달지 않는다 — 그래야 저장소
 * 없이 그대로 시험할 수 있다.
 */
export async function withDeadline<T>(work: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  const MISSED = Symbol("deadline");
  let timer: ReturnType<typeof setTimeout> | undefined;

  // 시한을 넘긴 뒤에 일이 실패해도 그 거절이 떠돌지 않도록 여기서 받아 둔다
  const guarded: Promise<T | typeof MISSED> = work.catch((err) => {
    console.error(`[db] ${label} failed:`, err);
    return MISSED;
  });
  const bell: Promise<typeof MISSED> = new Promise((resolve) => {
    timer = setTimeout(() => {
      console.error(`[db] ${label} exceeded ${ms}ms — 물러납니다`);
      resolve(MISSED);
    }, ms);
  });

  try {
    const out = await Promise.race([guarded, bell]);
    return out === MISSED ? fallback : out;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
