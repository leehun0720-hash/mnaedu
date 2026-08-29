/**
 * Supabase 설정은 전부 환경변수에서만 온다. 이 저장소는 공개되어 있으므로
 * 어떤 키도 코드에 들어가서는 안 된다 (기획 보고서 8장 · 리뉴얼 계획서 7장).
 *
 * 설정 전에도 사이트는 그대로 살아 있어야 한다 — 회원 기능만 잠기고
 * 공개 페이지는 지금처럼 동작한다. 그래서 값이 없을 때 던지지 않는다.
 *
 * 키 이름이 둘인 이유: Supabase가 anon 키를 publishable 키(sb_publishable_…)로
 * 바꾸는 중이다. 새 키는 anon 키의 드롭인 대체라 클라이언트 라이브러리는
 * 그대로 쓰지만, 환경변수 이름은 새 것을 우선하고 옛 이름도 받아 둔다.
 *
 * NEXT_PUBLIC_* 은 빌드 시점에 문자열로 치환되므로 반드시 이렇게 각각을
 * 그대로 적어야 한다 — process.env[변수] 같은 동적 조회로는 치환되지 않는다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export function isAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
