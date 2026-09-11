import "server-only";

import { createSessionToken, verifyEnvPassword, verifySessionToken } from "@/lib/auth";
import { credentialVersion, readStored } from "@/lib/admin-password";
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
  const stored = await readStored();
  if (stored) return matchesHash(input, stored.hash);
  return verifyEnvPassword(input);
}

export async function createSession(): Promise<string> {
  return createSessionToken(await credentialVersion());
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  // 비밀번호가 바뀐 뒤 발급된 토큰인지까지 본다. 저장소를 읽지 못하면 그
  // 확인만 건너뛴다 — 데이터베이스가 잠깐 흔들렸다고 회장이 문 밖에 서 있을
  // 수는 없다.
  let version: string | null = null;
  try {
    version = await credentialVersion();
  } catch {
    version = null;
  }
  return verifySessionToken(token, version);
}
