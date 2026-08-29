/**
 * Supabase 설정은 전부 환경변수에서만 온다. 이 저장소는 공개되어 있으므로
 * 어떤 키도 코드에 들어가서는 안 된다 (기획 보고서 8장 · 리뉴얼 계획서 7장).
 *
 * 설정 전에도 사이트는 그대로 살아 있어야 한다 — 회원 기능만 잠기고
 * 공개 페이지는 지금처럼 동작한다. 그래서 값이 없을 때 던지지 않는다.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
