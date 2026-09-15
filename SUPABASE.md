# Supabase 설정

회원 로그인과 문제·자료 저장소가 쓰는 데이터베이스입니다.
**설정 전에도 사이트는 그대로 동작합니다** — 공개 페이지는 예시 문제로 돌아가고,
가입 화면은 준비 중 안내로 물러납니다. 아래를 마치는 순간 회원 기능이 열립니다.

> **2026-08-29 설정 완료.** 운영 프로젝트(서울 리전)에 아래 1~4단계를 모두
> 적용했다 — 테이블 + RLS 잠금, 이메일 인증(가입 확인 메일 켬), 콜백 주소,
> Vercel 환경변수 4종(새 `sb_publishable_` 키 사용). 이 문서는 프로젝트를
> 다시 만들거나 도메인을 바꿀 때의 재설정 절차로 남겨 둔다.

호스팅은 Vercel을 유지합니다. Supabase는 어느 호스팅에서든 동일하게 동작하므로
플랫폼을 바꿀 이유가 없습니다.

## 1. 프로젝트 만들기

[supabase.com](https://supabase.com) → New project

| 항목 | 값 |
| --- | --- |
| Region | **Northeast Asia (Seoul)** — 드롭다운에서 직접 고르십시오 |
| Database Password | 임의의 긴 문자열 (아래 연결 문자열에 들어갑니다) |

> **리전을 반드시 직접 고르십시오.** 그냥 두면 Singapore·Virginia·Frankfurt 중
> 하나가 자동 배정됩니다. Vercel이 서울(`icn1`)이므로 DB도 서울이어야 합니다.
>
> 왜 중요한가: 자료실은 파일 본문을 DB에서 그대로 읽어 내보냅니다.
> 서울↔싱가포르는 왕복 70~90ms 수준이라 몇 MB짜리 문서 한 건에도 체감 지연이
> 붙습니다. 같은 리전이면 수 ms입니다.
>
> **이미 다른 리전으로 만드셨다면**: Supabase는 생성 후 리전 변경을 지원하지
> 않습니다. 데이터가 없을 때(테이블 생성 전) 새 프로젝트를 서울로 다시 만드는
> 것이 가장 쌉니다. 회원과 자료가 쌓인 뒤에는 덤프·복원 작업이 됩니다.
> 그대로 쓰시려면 Vercel 리전을 같은 곳으로 옮겨(`vercel.json`의 `regions`)
> 최소한 서버와 DB는 붙여 두십시오.

## 2. 테이블 만들기

Supabase 대시보드 → **SQL Editor** 에 `supabase/setup.sql` 전체를 붙여넣고
실행하십시오. 한 번이면 끝나고, 여러 번 실행해도 안전합니다.

이 파일은 세 부분입니다.

1. **테이블** — `drizzle/` 의 마이그레이션을 합친 것
2. **옛 데이터베이스 손보기** — 예전 앱에서 만든 표의 열을 지금 모양으로 맞춥니다
3. **접근 차단** — 아래 경고를 참조하십시오. 건너뛰면 안 됩니다.

> ### 저장이 안 될 때는 이 파일을 다시 실행하십시오
>
> 1부는 `CREATE TABLE IF NOT EXISTS` 입니다. 표가 이미 있으면 아무 일도 하지
> 않으므로, 예전 앱(레벨·포인트가 있던 시절)에서 만든 표는 열이 어긋난 채로
> 남습니다. 옛 `questions` 표의 `level` 열이 대표적입니다 — 지금 앱은 그 열을
> 보내지 않는데 NOT NULL 이라, 문제를 저장할 때마다 데이터베이스가 거절합니다.
> 칼럼과 자료는 새로 만든 표라 멀쩡하니 더 찾기 어렵습니다.
>
> 2부가 그런 흔적을 정리하고 나중에 더한 열을 채웁니다. 새 기능이 붙은 뒤
> 무언가 저장되지 않으면, 가장 먼저 이 파일을 통째로 다시 실행해 보십시오.

> ### ⚠️ 2부를 반드시 함께 실행하십시오
>
> Supabase는 `public` 스키마의 테이블을 **자동 생성 REST API로 노출**하고,
> 브라우저에 나가는 공개 키(anon · publishable)로 접근하게 합니다. 그대로 두면 누구나
> `questions` 테이블의 `answer`·`explanation`을 직접 읽어갑니다 — 정답과 회장
> 해설을 공개 데이터에서 원천 배제한다는 원칙(보고서 4.3 · 8장)이 무너집니다.
>
> `setup.sql` 2부가 RLS를 켜고 권한을 회수해 이 경로를 막습니다. 이 사이트는
> REST API를 전혀 쓰지 않고 서버가 직접 Postgres에 연결하므로, 잠가도
> 애플리케이션은 그대로 동작합니다.
>
> 실행 후 아래로 확인하십시오 — 네 테이블 모두 `true`여야 합니다.
>
> ```sql
> SELECT tablename, rowsecurity FROM pg_tables
> WHERE schemaname = 'public' ORDER BY tablename;
> ```

로컬에서 Drizzle로 하시려면 (2부는 별도로 실행해야 합니다):

```bash
POSTGRES_URL="<직결 문자열>" npx drizzle-kit migrate
```

> 마이그레이션은 풀러(6543)가 아니라 **직결(5432)** 문자열로 실행하십시오.

## 3. 인증 설정

Supabase 대시보드 → **Authentication**

- **Providers → Email**: 활성화, `Confirm email` 켜기
- **URL Configuration → Site URL**: 배포 주소 (예: `https://frontiermade.co.kr`)
- **Redirect URLs**에 추가:
  - `https://<배포주소>/auth/callback`
  - `http://localhost:3000/auth/callback` (로컬 개발용)

## 4. Vercel 환경변수

Vercel 대시보드 → Settings → Environment Variables 에 네 개를 넣습니다.

| 이름 | 어디서 가져오나 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → **API Keys** → `sb_publishable_…` |
| `POSTGRES_URL` | Project Settings → Database → Connection string → **Transaction pooler (6543)** |
| `POSTGRES_URL_NON_POOLING` | 같은 화면의 **Direct connection (5432)** — 마이그레이션용 |

`NEXT_PUBLIC_` 두 개는 브라우저로 나가도 되는 공개 키입니다. 나머지 둘은 서버 전용이며,
**저장소에는 어떤 키도 넣지 마십시오.** 이 저장소는 공개되어 있습니다.

넣은 뒤 **재배포**해야 적용됩니다.

> **키 형식이 두 가지입니다.** Supabase가 `anon` 키를 `sb_publishable_…` 키로
> 바꾸는 중입니다. 새 키는 anon 키의 드롭인 대체라 동작은 같습니다.
>
> - 새 프로젝트(권장): API Keys 화면의 `sb_publishable_…`을
>   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`에 넣으십시오.
> - 옛 프로젝트: `NEXT_PUBLIC_SUPABASE_ANON_KEY`라는 이름도 그대로 받습니다
>   (`lib/supabase/config.ts`가 새 이름을 먼저 보고 없으면 옛 이름을 씁니다).
>   둘 다 넣을 필요는 없습니다.
>
> 같은 화면의 **`sb_secret_…`(옛 service_role) 키는 선택입니다.** 기본 동작에는
> 필요 없습니다 — 서버는 Postgres에 직접 붙습니다. 아래 한 가지에만 쓰입니다.

### (선택) 관리자 화면에서 회원 계정까지 지우려면

우리 `members` 표는 **명단**이고, 신원(비밀번호·이메일)은 Supabase Auth가 쥐고
있습니다. 그래서 명단에서만 지우면 **계정이 남아 로그인이 계속 됩니다.**

관리자 화면에서 계정까지 함께 지우시려면 Vercel 환경변수에 하나를 더 넣으십시오.

| 이름 | 값 |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys 의 `sb_secret_…` (옛 `service_role`) |

넣으신 뒤 **재배포**하면 회원 탭의 단추가 「명단에서 내리기」에서 **「회원 삭제」**로
바뀌고, 누르면 계정까지 지워집니다. 넣지 않으셔도 사이트는 그대로 동작하며,
화면이 "명단에서만 내려집니다"라고 그대로 말합니다.

> **이 키의 무게** — 이 키는 RLS를 통째로 지나칩니다. 저장소에는 절대 두지 않고
> (이 저장소는 공개되어 있습니다), 이름에 `NEXT_PUBLIC_`을 붙이지 마십시오 —
> 붙이면 브라우저로 나갑니다. 서버에서만, 관리자 로그인을 통과한 요청에서만
> 쓰입니다(`lib/supabase/admin.ts`).

## 저장이나 조회가 멈출 때 — 표 잠금 풀기

SQL Editor에서 `ALTER TABLE`이 **Running…** 에서 멈추거나 "upstream timeout"이
뜨고, 동시에 관리자 화면이 "데이터베이스가 12초 안에 답하지 않았습니다"라고
말하면, 그 표를 **다른 접속이 잠그고 있는 것**입니다.

Postgres에서 `ALTER TABLE`은 표 전체를 독점해야 합니다. 그래서 누군가 트랜잭션을
열어 둔 채 두면(Table Editor를 열어 두었거나, SQL Editor의 다른 탭이 돌고 있거나)
그 뒤로 들어오는 **평범한 조회까지 줄줄이 함께 멈춥니다.**

새 SQL 탭에서 아래를 실행하십시오. 무엇이 막고 있는지 보여 주고, 그 접속만 끊습니다.

```sql
-- 1) 무엇이 막고 있는지 봅니다
select pid, state, round(extract(epoch from (now() - xact_start))) as 열린초,
       left(query, 60) as 쿼리
from pg_stat_activity
where datname = current_database() and pid <> pg_backend_pid() and state <> 'idle'
order by xact_start;

-- 2) 열어 둔 채 놀고 있거나, 30초 넘게 붙들고 있는 접속을 끊습니다
select pg_terminate_backend(pid)
from pg_stat_activity
where datname = current_database()
  and pid <> pg_backend_pid()
  and (state = 'idle in transaction'
       or (state = 'active' and xact_start < now() - interval '30 seconds'));
```

끊고 나면 멈춰 있던 `ALTER TABLE`이 곧바로 끝나고 화면도 돌아옵니다. 앱의 정상
요청은 1초 안에 끝나므로 위 조건에 걸리지 않습니다.

예방: SQL을 실행하실 때는 **탭을 하나만** 쓰시고, Table Editor로 같은 표를 열어
둔 채 DDL을 돌리지 마십시오.

## 동작 방식 요약

- **신원**(이메일·비밀번호·인증 메일·비밀번호 재설정)은 Supabase Auth가 맡습니다.
- **회원 데이터**는 우리 `members` 테이블에 이름만 두고 Supabase 사용자 id로
  연결됩니다. 등급도 포인트도 결제도 없습니다.
- **정답·해설**은 공개 데이터에서 원천 배제되며, 로그인만 확인하는
  `/api/answer` 응답으로만 나갑니다. 차감할 포인트도 확인할 등급도 없습니다.
- **자료실 파일**은 `documents.content`에 base64로 담깁니다. 별도 스토리지
  버킷과 서비스 키를 만들지 않기 위한 선택입니다 — 목록 조회는 이 열을
  선택하지 않으므로 큰 값은 내려받을 때만 오갑니다.

## 동작하지 않을 때

| 증상 | 원인 |
| --- | --- |
| 가입 화면에 "준비가 끝나면" 안내만 보임 | `NEXT_PUBLIC_SUPABASE_*` 두 개가 없음 |
| 로그인은 되는데 내 학습 현황이 비어 있음 | `POSTGRES_URL` 없음, 또는 2단계 미실행 |
| 인증 메일 링크가 로그인 화면으로 되돌아옴 | Redirect URLs에 `/auth/callback` 누락 |
| `prepared statement` 오류 | 풀러(6543) 문자열이 아니라 직결을 넣었거나 그 반대 |

## Supabase MCP (선택)

`.mcp.json`에 Supabase MCP 서버가 등록되어 있습니다. 연결하면 Claude가
대시보드를 거치지 않고 마이그레이션 실행·스키마 조회·디버깅을 할 수 있습니다.

**인증은 각자의 로컬 터미널에서** 해야 합니다 (IDE 확장이나 웹 세션이 아니라):

```bash
claude /mcp     # supabase 선택 → Authenticate
```

주의할 점 두 가지입니다.

- `.mcp.json`의 `project_ref`는 **프로젝트마다 다릅니다.** 리전을 바꾸느라
  프로젝트를 다시 만들면 이 값도 새 것으로 고쳐야 합니다.
- 등록된 기능 목록에 `database`·`development`가 들어 있어 **운영 DB에 쓰기가
  가능합니다.** 조회만 필요하다면 URL의 `features`를 줄이거나 Supabase의
  read-only 옵션을 쓰는 편이 안전합니다.
