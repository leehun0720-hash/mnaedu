# 프론티어 M&A — 홈페이지 · 퀴즈 아카데미

두 개의 얼굴, 하나의 선별 구조. 첫 화면(게이트웨이)에서 두 사이트로 갈라지고,
양쪽 화면 **우측 고정 바**로 서로를 오간다.

| 경로 | 성격 |
| --- | --- |
| `/` | 게이트웨이 — MADE 로고 애니메이션 · 슬로건 · [기업 홈페이지] · [퀴즈 아카데미] 진입 버튼 |
| `/company` | 기업 홈페이지 — 새 소식 · 회사소개(운영원칙·기사/칼럼) · 주요업무 5분야 · 직원채용 · Q&A · 문의사항(양식+대화창) |
| `/company/business/<slug>` | 업무 상세 — `brokerage` · `dispute` · `financing` · `family-office` · `investor-club` |
| `/academy` | 퀴즈 아카데미 — 문제은행 2축 · 수강 여정 · 회원 등급/포인트 · 5레벨 승급 · 선발 테스트 |
| `/academy/join` · `/academy/login` | 회원가입 · 로그인 (아카데미 단일 창구) |
| `/academy/quiz/<id>` | 문제 풀이 — 답안 제출 → 채점 → 점수·포인트 → 해설 |
| `/academy/billing` | 유료회원 전환 — 요금제 신청 · 이용 기간 · 신청 내역 |
| `/academy/me` | 내 학습 현황 — 등급 · 포인트 · 점수 집계 · 레벨 열림 상태 |
| `/privacy` | 개인정보처리방침 |
| `/admin` | 출제 관리자 (회장 전용, `ADMIN.md` 참조) |

## 제작 원칙 (기획 보고서 ver2.2 / TENAI-2026-0828-01)

- **정본 분류 체계** — 「업무분야별 카테고리」의 **5분야 58주제**가 홈페이지 게시판과
  아카데미 문제은행의 공식 분류다. `lib/company.ts` 한 곳에서만 정의하고
  `lib/questions.ts`가 그대로 가져다 쓴다(문제은행 가로축).
- **문제은행 2축** — 세로축 난이도 L1~L5 × 가로축 5분야 58주제. 퀴즈 1건 = 3문제.
- **회원 창구 단일화** — 회원가입은 아카데미에서만 받는다. 홈페이지에는 가입 메뉴가 없고
  우측 고정 바에서 연결한다. 무료(기초 정보 + L1) / 유료(L2~L5) 2등급.
- **정답·해설 비공개** — 정답과 회장 해설은 공개 데이터에서 원천 배제한다. 열람은 로그인
  + 포인트 차감 화면에 한정한다.
- **패밀리오피스 · 투자가 클럽** — 메뉴 · 기초 소개 · 커리큘럼 목차 · 상담 접점까지만 웹에
  두고, 설립·운영·가입 세부는 전면 오프라인(`offlineOnly: true`).
- **공개 표현 순화** — 민감 주제명은 공개 목차에서 순화하고 원문은 `sourceLabel`에 남겨
  대조할 수 있게 한다.
- **복사 방지** — 우클릭·드래그 선택·복사·전체선택·인쇄·개발자도구 단축키를
  억제하고(`app/copy-guard.tsx`), 모바일 길게 누르기와 이미지 끌기도 막는다.
  인쇄는 `@media print`로 지면 자체를 비운다. 관리자 화면에는 적용하지 않는다.
- **열람자 워터마크** — 화면 캡처는 어떤 웹 기술로도 막지 못한다. 그래서 회장
  해설 위에 열람자(가린 이메일)와 시각을 옅게 깔아, 캡처가 돌아다닐 때 출처가
  드러나게 한다(`app/watermark.tsx`). 막는 장치가 아니라 억제하는 장치다.
- **승인 전 실적 수치 비노출** — 실적 문구는 회장 승인(보고서 9장-8) 전까지 싣지 않는다.
- **풀이·채점 체계** — 한 문제 한 번 제출(`answers`). 객관식은 즉시 자동 채점,
  주관식은 관리자 채점함에서 회장이 채점하거나 `ANTHROPIC_API_KEY` 설정 시 AI가
  즉시 채점한다. 60점 이상 통과면 퀴즈 포인트 적립 + 통과 레벨 반영.
- **해설 모자이크** — 해설은 정답 표시 아래에 놓이되, 열람 자격 확인 전에는
  실물 대신 미끼 문단 위 블러만 보인다(무료회원은 열 수 없고, 유료회원이
  클릭·포인트 차감으로 해제). CSS 블러는 장식일 뿐이므로 실제 본문은
  `/api/explanation` 응답으로만 나간다.
- **포인트 원장 일원화** — 잔액이 바뀌는 모든 경로(가입·퀴즈 통과·해설 열람·관리자
  조정)가 `point_ledger`에 기록을 남긴다. 관리자 조정만 원장을 건너뛰면 잔액과
  내역이 어긋나 원장을 두는 의미가 사라진다.
- **결제 · 구독** — 회원이 `/academy/billing`에서 신청하면 주문이 쌓이고, 회장이
  `/admin` 결제 관리에서 승인하면 이용 기간이 열린다. 만료는 `members.paid_until`
  하나로 판정하며(`isPaidNow`), 화면과 API는 유효 등급만 보므로 만료 처리를 각자
  기억하지 않는다. 토스페이먼츠는 승인 주체만 갈아 끼우면 된다 — `BILLING.md` 참조.
- **요금 비공개 유지** — 금액은 회장 승인 전까지 화면에 싣지 않는다
  (`SHOW_PRICE`). 과거 주문에는 승인 시점 금액이 박혀 소급되지 않는다.
- **등급 수동 전환** — 결제 없이 올려야 하는 계정(회장·심사용)은 `/admin` 회원
  관리에서 직접 올린다. 이 경우 만료일이 없어 기한 없이 유효하다.
- **회원 시스템** — 신원은 Supabase Auth, 등급·포인트는 `members`/`point_ledger`.
  무료(L1) / 유료(L2~L5) 2등급이며, 해설은 포인트 차감을 거친 `/api/explanation`
  으로만 나간다. 설정은 `SUPABASE.md` 참조. 미설정 상태에서도 사이트는 동작한다.
- **AI 채점 경계** — 채점에는 모범답안이 필요한데 수험자 글이 같은 요청에
  들어간다. 프롬프트 지시는 방어가 아니므로(공격 문장과 같은 채널) 두 겹으로
  막는다 — 수험자 글은 별도 턴에 구분자로 감싸고, 돌려받은 강평이 모범답안·
  출제 의도와 여덟 낱말 이상 겹치면 서버가 버린다(`lib/grading-rules.ts`).
  L4·L5는 AI가 채점하지 않는다 — 주입으로 만점을 받아도 승급하지 못한다.
- **문제 본문도 유료 자산** — 답안 제출뿐 아니라 화면 자체를 레벨로 막는다.
  잠긴 문제는 분류만 보이고 본문은 서버를 떠나지 않는다.
- **로그인 무차별 대입 차단** — 서버리스에서는 응답 지연도 메모리 카운터도
  소용없다(요청마다 다른 인스턴스). 실패를 DB에 세어 잠근다.
- **DB 접근 차단** — `supabase/setup.sql`이 RLS를 켜고 anon·authenticated 권한을
  회수한다. 이걸 빼면 브라우저에 나가는 공개 키로 정답·해설이 REST API를 통해
  그대로 읽힌다.
- **서버 전용 경계** — `db/`, `lib/questions-db.ts`, `lib/members.ts`는 `server-only`로
  막혀 있다. 클라이언트가 쓰는 순수 규칙은 `lib/questions.ts`·`lib/membership.ts`에 있다.

## 미결 · 확인 대기

- 도메인 `frontiermade.co.kr` 등록·사용 확정 (9장-2)
- 문의 수신 메일 확정 후 서버 발송 연결 — 현재는 메일 초안 전달 방식 (9장-15)
- 사무실 상세 주소(동·층) 확인
- 유료 요금 확정 후 금액 공개 (`SHOW_PRICE`) · 토스페이먼츠 연결 (`BILLING.md`)

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
