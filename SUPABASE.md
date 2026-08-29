# Supabase 설정

회원 시스템(가입·로그인·등급·포인트)과 문제 저장소가 쓰는 데이터베이스입니다.
**설정 전에도 사이트는 그대로 동작합니다** — 공개 페이지는 예시 문제로 돌아가고,
가입 화면은 준비 중 안내로 물러납니다. 아래를 마치는 순간 회원 기능이 열립니다.

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
> 왜 중요한가: 해설 열람 한 번에 회원 조회 → 문제 조회 → 이력 확인 → 포인트
> 차감 → 기록까지 왕복이 여러 번 연달아 일어납니다. 서울↔싱가포르는 왕복
> 70~90ms 수준이라 이것만으로 0.5초 가까이가 네트워크로 나갑니다. 같은
> 리전이면 수 ms입니다.
>
> **이미 다른 리전으로 만드셨다면**: Supabase는 생성 후 리전 변경을 지원하지
> 않습니다. 데이터가 없을 때(테이블 생성 전) 새 프로젝트를 서울로 다시 만드는
> 것이 가장 쌉니다. 회원·포인트가 쌓인 뒤에는 덤프·복원 작업이 됩니다.
> 그대로 쓰시려면 Vercel 리전을 같은 곳으로 옮겨(`vercel.json`의 `regions`)
> 최소한 서버와 DB는 붙여 두십시오.

## 2. 테이블 만들기

Supabase 대시보드 → **SQL Editor** 에서 저장소의 마이그레이션을 순서대로 실행합니다.

1. `drizzle/0000_puzzling_bastion.sql`
2. `drizzle/0001_pretty_ken_ellis.sql`

로컬에서 하려면 연결 문자열을 넣고 아래를 실행해도 됩니다.

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
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public key |
| `POSTGRES_URL` | Project Settings → Database → Connection string → **Transaction pooler (6543)** |
| `POSTGRES_URL_NON_POOLING` | 같은 화면의 **Direct connection (5432)** — 마이그레이션용 |

`NEXT_PUBLIC_` 두 개는 브라우저로 나가도 되는 공개 키입니다. 나머지 둘은 서버 전용이며,
**저장소에는 어떤 키도 넣지 마십시오.** 이 저장소는 공개되어 있습니다.

넣은 뒤 **재배포**해야 적용됩니다.

## 5. 유료회원 전환

결제 연결 전까지는 관리자가 수동으로 등급을 올립니다. SQL Editor에서:

```sql
update members set tier = 'paid', updated_at = now() where email = '회원이메일';
```

## 동작 방식 요약

- **신원**(이메일·비밀번호·인증 메일·비밀번호 재설정)은 Supabase Auth가 맡습니다.
- **업무 데이터**(등급·포인트·통과 레벨)는 우리 `members` 테이블에 있고, Supabase
  사용자 id로 연결됩니다.
- **포인트**는 `point_ledger`에 건별로 남습니다. 잔액만 두면 왜 늘고 줄었는지
  설명할 수 없기 때문입니다.
- **해설**은 공개 데이터에서 원천 배제되며, 로그인 + 포인트 차감을 거친
  `/api/explanation` 응답으로만 나갑니다. 한 번 연 해설은 다시 차감하지 않습니다.

## 동작하지 않을 때

| 증상 | 원인 |
| --- | --- |
| 가입 화면에 "준비가 끝나면" 안내만 보임 | `NEXT_PUBLIC_SUPABASE_*` 두 개가 없음 |
| 로그인은 되는데 내 학습 현황이 비어 있음 | `POSTGRES_URL` 없음, 또는 2단계 미실행 |
| 인증 메일 링크가 로그인 화면으로 되돌아옴 | Redirect URLs에 `/auth/callback` 누락 |
| `prepared statement` 오류 | 풀러(6543) 문자열이 아니라 직결을 넣었거나 그 반대 |
