import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Supabase 관리 API — 계정 자체를 다루는 유일한 길.
 *
 * ── 왜 이것이 따로 필요한가 ────────────────────────────────────────
 * 우리 members 표는 '명단'이고, 신원(비밀번호·이메일)은 Supabase Auth가 쥐고
 * 있다. 그래서 명단에서 지워도 계정은 남아 로그인이 된다 — 회장이 "DB에서
 * 회원을 삭제해도 로그인이 된다"고 하신 그 자리다. 계정까지 지우려면 이 키가
 * 있어야 한다.
 *
 * ── 이 키의 무게 ──────────────────────────────────────────────────
 * 이 키는 RLS를 통째로 지나친다. 그래서 세 가지를 지킨다.
 *   1. 저장소에 절대 두지 않는다 — 배포 설정(Vercel 환경변수)에만 있다.
 *   2. 서버에서만 쓴다. server-only 표시로 클라이언트 번들에 섞이면 빌드가
 *      그 자리에서 실패한다. NEXT_PUBLIC_ 이름을 쓰지 않는 이유이기도 하다.
 *   3. 관리자 로그인을 통과한 요청에서만 부른다.
 *
 * 없어도 사이트는 그대로 동작한다. 그때는 명단에서 내리는 것까지만 되고,
 * 화면이 "계정은 남는다"고 그대로 말한다.
 */
function secretKey(): string {
  // Supabase가 service_role 키를 sb_secret_… 로 바꾸는 중이라 두 이름을 받는다
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

/** 계정까지 지울 수 있는 상태인가 — 화면이 이 값을 보고 말을 고른다 */
export function canManageAccounts(): boolean {
  return Boolean(SUPABASE_URL && secretKey());
}

function adminClient() {
  return createClient(SUPABASE_URL, secretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 계정을 지운다. 지웠으면 true.
 *
 * 키가 없으면 아무 일도 하지 않고 false — 부르는 쪽이 "명단에서만 내렸다"고
 * 말할 수 있게 한다. 실패도 false다: 명단에서 내리는 일까지 함께 무를
 * 이유는 없다.
 */
export async function deleteAuthUser(authId: string): Promise<boolean> {
  if (!canManageAccounts() || !authId) return false;
  try {
    const { error } = await adminClient().auth.admin.deleteUser(authId);
    if (error) {
      console.error("[auth] account delete failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[auth] account delete failed:", err);
    return false;
  }
}
