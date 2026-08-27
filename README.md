# 프론티어 M&A — 홈페이지 · 아카데미

두 개의 얼굴, 하나의 선별 구조. 웹은 메인 게이트에서 두 사이트로 갈라진다.

| 경로 | 성격 |
| --- | --- |
| `/` | 메인 게이트 — 기업 홈페이지 입장 버튼 · 아카데미 입장 버튼 |
| `/company` | 기업 홈페이지 (의뢰인용) — 회사소개 · 운영원칙 · 주요업무 5 · 인사이트 · Q&A · 채용 · 문의 |
| `/company/business/<slug>` | 업무 상세 — `brokerage`(M&A 중개) · `dispute`(경영권 분쟁) · `financing`(M&A 자금조달) |
| `/academy` | M&A 아카데미 (수련자용) — 5대 과정 · 5레벨 승급 체계 · 선발 테스트 |
| `/admin` | 출제 관리자 (회장 전용, `ADMIN.md` 참조) |

- 패밀리오피스·투자가 클럽은 웹 부재 원칙: `/company` 업무 목록에 **명칭 한 줄만** 두고 상세 페이지를 만들지 않는다.
- 두 사이트는 디자인·내비게이션을 완전히 분리하고, 서로를 잇는 문은 버튼 하나씩만 둔다.
- 기업 홈페이지 문안은 `lib/company.ts` 한 곳에서 관리한다(회장 원고 기반 — 임의 수정 금지).
- 문제의 정답·출제 의도는 공개 페이지로 나가는 데이터에서 원천 배제한다(기존 불변 원칙).

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
