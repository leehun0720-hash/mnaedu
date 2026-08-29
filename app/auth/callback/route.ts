import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Supabase가 메일로 보낸 인증 링크가 돌아오는 자리.
 * 코드를 세션으로 바꾼 뒤 내 학습 현황으로 보낸다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await getSupabaseServer();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/academy/me", url.origin));
  }

  // 링크가 만료됐거나 이미 쓴 경우 — 로그인 화면에서 다시 시작하게 한다
  return NextResponse.redirect(new URL("/academy/login?expired=1", url.origin));
}
