# ㈜프론티어 M&A — 브랜드 페이지

교육 사이트가 아니다. **신뢰를 증명해 상담이 들어오게 하는 것** 하나가 이
사이트의 일이다. 온라인은 사람이 모이는 자리이고, 상담·미팅·수익은 오프라인에서
일어난다.

## 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 브랜드 페이지 — 회사소개 · 주요업무 5분야 · **실무 문제** · **자료실** · 직원채용 · Q&A · 문의 |
| `/business/<slug>` | 업무 상세 — `brokerage` · `dispute` · `financing` · `family-office` · `investor-club` |
| `/join` · `/login` | 회원 등록 · 로그인 (이메일) |
| `/privacy` | 개인정보처리방침 |
| `/admin` | 문제 출제 · 자료실 · 회원 명단 (회장 전용) |

## 설계 원칙

- **회장의 손이 계속 가는 기능은 두지 않는다.** 이것이 첫째 제약이다.
  채점·레벨·승급·포인트·유료 결제·회원 응대는 전부 없앴다. 회원 문의가 생길
  구조를 만들지 않는 것이 목적이다.

- **문제는 공개, 정답은 회원.** 문제 본문을 읽고 수준을 가늠하는 것이 이 장치의
  전부다. 정답·해설은 공개 페이지 데이터에 실리지 않고 `/api/answer`가 로그인
  세션을 확인한 뒤에만 내보낸다. 이 경로가 막히면 정답이 새는 것이 아니라
  열리지 않는다.

- **자료실은 문턱 없이 연다.** 실력을 보여 주려고 두는 것이므로 로그인을
  요구하지 않는다. 파일은 별도 스토리지 버킷 없이 DB(`documents.content`,
  base64)에 담는다 — 올리는 사람이 한 명이고 규모가 수십 건이라, 버킷·RLS
  정책·서비스 키를 새로 만드는 대가가 이득보다 크다. 목록 조회는 본문 열을
  선택하지 않으므로 큰 값이 오가지 않는다.

- **5분야 정본** — 「업무분야별 카테고리」의 5분야 58주제가 홈페이지 게시판과
  실무 문제의 공식 분류다. `lib/company.ts` 한 곳에서만 정의하고 나머지는
  모두 이 파일을 참조한다. 난이도(레벨) 축은 폐지했다.

- **시크릿 오피스 블라인드** — 패밀리오피스·투자가 클럽은 오프라인 전용이다.
  이 두 분야의 문제는 발행 여부와 무관하게 공개 목록·해설 경로 어디에도
  오르지 않는다. 어느 분야가 그런지는 `offlineOnly` 한 곳에서만 정한다.

- **옛 `intent` 열은 남기되 내보내지 않는다** — 이전 앱에서 "비공개"를 전제로
  작성된 출제 의도 메모다. 회원에게 보이는 `explanation`으로 자동 전환하면
  작성 당시의 전제가 깨지므로, 데이터는 보존하고 관리자 화면에서만 참고용으로
  보여 준다. 공개 여부는 회장이 직접 판단해 옮긴다.

- **복사 방지는 방어가 아니라 근거 확보** — 우클릭·드래그·단축키 제한과 열람자
  워터마크를 두지만, 완전한 차단은 불가능하다. 목적은 분쟁 시 근거를 남기는 데
  있다.

- **로그인 무차별 대입 차단** — 서버리스에서는 응답 지연도 메모리 카운터도
  소용없다(요청마다 다른 인스턴스). 실패를 DB에 세어 잠근다.

- **DB 접근 차단** — `supabase/setup.sql`이 RLS를 켜고 anon·authenticated 권한을
  회수한다. 이걸 빼면 브라우저에 나가는 공개 키로 정답·해설이 REST API를 통해
  그대로 읽힌다.

- **서버 전용 경계** — `db/`, `lib/questions-db.ts`, `lib/members.ts`,
  `lib/documents.ts`는 `server-only`로 막혀 있다. 클라이언트가 쓰는 순수 분류
  규칙만 `lib/questions.ts`에 있다.

- **비밀은 코드에 없다** — 저장소가 공개이므로 모든 키는 Vercel 환경변수에만
  존재한다.

## 문서

| 문서 | 내용 |
| --- | --- |
| `기능안내서.md` | 회장님용 한 장 요약 — 무엇을 하시면 되는지 |
| `MANUAL.md` | 운영 매뉴얼 상세본 |
| `ADMIN.md` | 관리자 화면 설정과 사용 |
| `SUPABASE.md` | 데이터베이스·인증 설정 절차 |

## 미결 · 확인 대기

- 도메인 `frontiermade.co.kr` 등록·사용 확정
- 문의 수신 메일 확정 후 서버 발송 연결 — 현재는 메일 초안 전달 방식
- 사무실 상세 주소(동·층) 확인
- 실적 공개 문구 승인 (예: "27건 수행 · 26승 1무")

## 이전 버전

레벨·포인트·유료 결제·채점이 있던 버전은 `app1-academy` 태그·브랜치에 있다.

아래는 이 저장소의 기술 스택(vinext 스타터) 안내다.

# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
