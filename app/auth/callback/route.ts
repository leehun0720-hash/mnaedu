import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { recordMember } from "@/lib/members";

export const dynamic = "force-dynamic";

/**
 * Supabase가 메일로 보낸 인증 링크가 돌아오는 자리.
 *
 * 두 가지 일을 한다. 코드를 세션으로 바꾸고, 그 자리에서 회원 명단에 올린다.
 * 명단 올리기를 나중으로 미루면(예전에는 '공개 페이지를 한 번 열 때') 인증을
 * 마치고도 명단에 없는 분이 생긴다 — 회장이 "회원은 등록됐는데 0명"이라
 * 하신 그 자리다. 사람이 진짜인 것을 아는 순간이 바로 여기다.
 *
 * 실패하면 왜 실패했는지를 로그인 화면으로 넘겨 준다. 아무 말 없이 로그인
 * 화면만 띄우면, 인증을 마쳤다고 믿는 분이 이유도 모른 채 되돌아간다.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const supabase = await getSupabaseServer();

  // Supabase가 링크 자체를 거절한 경우 — 만료·재사용 등
  const linkError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (linkError) return back(url, "expired");

  if (!supabase) return back(url, "unconfigured");
  if (!code) return back(url, "nocode");

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // 가장 잦은 경우: 가입한 브라우저가 아닌 곳(메일 앱 안의 브라우저 등)에서
    // 링크를 열었다. 그쪽에는 대조할 열쇠가 없어 교환이 실패한다.
    console.error("[auth] code exchange failed:", error.message);
    return back(url, "othertab");
  }

  if (data.user) await recordMember(data.user);
  return NextResponse.redirect(new URL("/?welcome=1", url.origin));
}

function back(url: URL, reason: string) {
  return NextResponse.redirect(new URL(`/login?auth=${reason}`, url.origin));
}
