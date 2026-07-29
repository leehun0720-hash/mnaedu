# 출제 관리자 설정

회장님이 `/admin`에서 직접 문제를 작성·발행하는 기능입니다.
설정 전까지는 사이트가 기존 예시 문제로 그대로 동작하므로, 아래 작업 중에도
운영에는 영향이 없습니다.

## 1. 데이터베이스 만들기

Vercel 대시보드 → **Storage** → **Create Database** → **Neon** (Serverless Postgres)

연결 대화상자에서 아래와 같이 설정합니다.

| 항목 | 값 |
| --- | --- |
| Project | `mnaedu` |
| Environments | Production, Preview, **Development** 모두 체크 |
| Create database branch for deployment | 둘 다 해제 |
| Custom Prefix | `DATABASE` (비워두면 `STORAGE`가 되며, 이 경우도 동작합니다) |
| Sensitive | 켠 상태 유지 |

Development를 체크해야 2단계에서 로컬로 접속 정보를 받을 수 있습니다.
접속 정보는 자동 주입되므로 복사할 필요 없습니다.

## 2. 테이블 만들기

데이터베이스를 만든 뒤 로컬에서 한 번만 실행합니다.

```bash
npx vercel env pull .env.local
npx drizzle-kit migrate
```

또는 Vercel 대시보드의 Query 탭에서 `drizzle/0000_puzzling_bastion.sql` 내용을
그대로 실행해도 됩니다.

## 3. 관리자 비밀번호 설정

Vercel 대시보드 → **Settings** → **Environment Variables** 에 두 개를 추가합니다.

| 이름 | 값 |
| --- | --- |
| `ADMIN_PASSWORD` | 회장님이 사용하실 비밀번호 |
| `ADMIN_SESSION_SECRET` | 아무 긴 임의 문자열 (32자 이상 권장) |

`ADMIN_SESSION_SECRET`은 아래로 만들 수 있습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

추가한 뒤 **재배포**해야 적용됩니다.

> 이 저장소는 공개되어 있습니다. 비밀번호는 절대 코드나 커밋에 넣지 마십시오.
> 위 두 값은 Vercel 설정에만 존재합니다.

## 4. 사용

`https://<도메인>/admin` 에서 비밀번호로 로그인합니다.

- **붙여넣기로 초안 만들기** — 문제를 그대로 붙여넣으면 과정·난이도·유형·보기·정답을
  추정해 아래 입력란을 채웁니다. 추정이므로 저장 전에 확인이 필요합니다.
- **항목별 입력** — 과정, 난이도, 유형을 직접 고르고 문제를 작성합니다.
- **발행** 체크를 켠 문제만 홈페이지 &lsquo;선발 테스트&rsquo;에 최신순으로 표시됩니다.
  체크를 끄면 임시 보관됩니다.

**정답과 출제 의도는 홈페이지에 전달되지 않습니다.** 공개 페이지로 나가는 데이터에서
아예 빠지므로, 브라우저 개발자 도구로도 볼 수 없습니다.

## 동작하지 않을 때

| 화면 | 원인 |
| --- | --- |
| "관리자 설정이 필요합니다" | `ADMIN_PASSWORD` 또는 `ADMIN_SESSION_SECRET` 없음 |
| "데이터베이스가 연결되지 않았습니다" | `POSTGRES_URL` 없음 |
| 로그인은 되는데 저장 실패 | 2단계 테이블 생성을 하지 않음 |
