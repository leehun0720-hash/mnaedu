import "server-only";

import { createSessionToken, verifyEnvPassword, verifySessionToken } from "@/lib/auth";
import { credentialVersion, lookupStored } from "@/lib/admin-password";
import { matchesHash } from "@/lib/password-hash";

/**
 * 관리자 인증 — 저장소를 보는 층.
 *
 * 규칙과 서명은 lib/auth.ts에 있고, 여기서는 "지금 기준이 무엇인가"를
 * 데이터베이스에서 읽어다 붙인다. 둘을 나눈 이유는 규칙 쪽을 저장소 없이
 * 그대로 시험할 수 있게 하기 위해서다.
 */

/** 바꾼 적이 있으면 저장된 해시가, 없으면 배포 설정의 값이 기준이다 */
export async function verifyPassword(input: string): Promise<boolean> {
  const { stored } = await lookupStored();
  if (stored) return matchesHash(input, stored.hash);
  return verifyEnvPassword(input);
}

export async function createSession(): Promise<string> {
  // 기준을 읽지 못했다면 아직 바꾸신 적이 없는 것으로 보고 "0"을 새긴다.
  // 나중에 진짜 세대가 드러나면 이 토큰은 거절되고 다시 로그인하시게 된다 —
  // 모르는 채로 계속 통과시키는 것보다 낫다.
  return createSessionToken((await credentialVersion()) ?? "0");
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  // 비밀번호가 바뀐 뒤 발급된 토큰인지까지 본다. 저장소를 읽지 못하면(null)
  // 그 확인만 건너뛴다 — 데이터베이스가 잠깐 흔들렸다고 회장이 문 밖에 서
  // 있을 수는 없다.
  return verifySessionToken(token, await credentialVersion());
}
