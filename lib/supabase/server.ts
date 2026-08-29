import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from "./config";

/**
 * 서버 컴포넌트·라우트 핸들러에서 쓰는 Supabase 클라이언트.
 * 세션은 쿠키에 담기므로 next/headers의 쿠키 저장소를 물려준다.
 */
export async function getSupabaseServer() {
  if (!isAuthConfigured()) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 미들웨어와
          // 라우트 핸들러가 맡으므로 여기서는 조용히 넘긴다.
        }
      },
    },
  });
}

/** 로그인한 Supabase 사용자. 미설정이거나 비로그인이면 null. */
export async function getAuthUser() {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
