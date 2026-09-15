// 서버 전용 — postgres 드라이버는 Node 소켓을 쓴다. 클라이언트 컴포넌트가
// 실수로 이 모듈을 끌어오면 빌드가 그 자리에서 실패하게 둔다.
import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Supabase Postgres.
 *
 * 서버리스(Vercel Functions)에서는 요청마다 연결이 새로 열릴 수 있으므로
 * Supabase의 트랜잭션 풀러(Supavisor, 6543 포트) 문자열을 쓴다. 그 모드는
 * prepared statement를 지원하지 않아 `prepare: false`가 필수다.
 *
 * 이름이 다른 여러 변수를 받아들이는 이유는 대시보드 연동 방식에 따라
 * 주입되는 키가 달라서다 — 있는 것을 골라 쓴다.
 */
const URL_VARS = [
  "POSTGRES_URL",
  "DATABASE_URL",
  "SUPABASE_DB_URL",
  // 풀러를 못 쓰는 상황(마이그레이션 등)을 위한 직결 문자열
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
] as const;

function connectionString(): string | undefined {
  for (const name of URL_VARS) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

/**
 * 데이터베이스는 의도적으로 선택 사항이다. 연결 문자열이 없어도 빌드와
 * 공개 페이지가 살아 있어야 하므로, 호출부가 먼저 이 값을 묻고 시드로
 * 물러난다. 문자열이 생기는 순간 같은 코드가 실제 DB를 쓰기 시작한다.
 */
export function isDbConfigured(): boolean {
  return Boolean(connectionString());
}

let cached: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  const url = connectionString();
  if (!url) {
    throw new Error(
      `No database connection string. Expected one of ${URL_VARS.join(", ")}. Supabase 대시보드 → Project Settings → Database → Connection string(Transaction pooler)에서 가져와 환경변수에 넣으십시오.`
    );
  }
  if (!cached) {
    // 서버리스: 연결을 오래 붙들지 않는다. 풀러가 실제 풀링을 맡는다.
    // connect_timeout이 없으면 풀러가 응답하지 않을 때 요청이 끝나지 않고
    // 화면은 "저장 중"에 갇힌다 — 기다림을 끝내고 오류로 만든다.
    const sql = postgres(url, {
      prepare: false,
      // 하나만 두면 갇힌 조회 하나가 그 인스턴스의 모든 요청을 막는다 —
      // 회원 표가 잠겼을 때 진단 경로까지 함께 죽었던 이유다. 몇 개는 둔다.
      max: 3,
      idle_timeout: 20,
      connect_timeout: 15,
      // 서버가 스스로 오래된 문장을 끊게 한다. 화면이 12초에 포기해도 문장은
      // 서버에 남아 연결을 붙들고 있었다 — 끊어야 연결이 돌아온다.
      // 열어 둔 채 노는 트랜잭션도 30초면 정리해, 우리 쪽이 표를 잠그는 일이 없게 한다.
      connection: {
        statement_timeout: 15_000,
        idle_in_transaction_session_timeout: 30_000,
      },
    });
    cached = drizzle(sql, { schema });
  }
  return cached;
}
