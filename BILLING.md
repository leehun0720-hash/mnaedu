# 유료 결제

결제 대행(PG)을 붙이기 전에도 전환 흐름 전체가 돕니다. 회원이 신청하면 주문이
쌓이고, 관리자가 `/admin` **결제 관리**에서 승인하면 그 자리에서 이용 기간이
열립니다. 토스페이먼츠를 붙일 때 바꿀 곳은 **한 군데**입니다.

## 지금의 흐름 (PG 없이)

```
회원  /academy/billing  → 요금제 선택 → 신청
      ↓ orders (status: pending)
회장  /admin  결제 관리  → 입금 확인 후 [승인]
      ↓ activateOrder()
      members.tier = paid,  paid_until 연장
```

- 승인은 `pending` 주문에만 걸립니다. 두 번 눌러도 기간이 두 배가 되지 않습니다.
- 남은 기간이 있으면 **그 끝에 이어 붙습니다** — 미리 연장해도 손해가 없습니다.
- 회원당 확인 대기 주문은 하나뿐입니다. 중복 입금·중복 승인을 막습니다.

## 요금과 공개 여부

요금제는 `lib/billing.ts`의 `PLANS` 한 곳에만 있습니다. 금액은 **회장 승인
전까지 화면에 나가지 않습니다**(보고서 9장-8). 신청 화면은 금액 대신 "상담 후
안내"로 표시됩니다.

공개하실 때는 같은 파일의 한 줄만 바꾸십시오.

```ts
export const SHOW_PRICE = true;
```

> 과거 주문에는 **승인 시점의 금액이 박혀 있습니다.** 요금을 올려도 지난 주문의
> 기록은 바뀌지 않습니다.

## 구독 만료

`members.paid_until`이 만료 시각입니다.

- **값이 있으면** 그 시각까지만 유료입니다. 지나면 권한이 자동으로 무료로 내려갑니다.
- **null이면 기한 없음** — 관리자가 `/admin`에서 직접 올린 계정(회장·심사용)입니다.

만료 판정은 `lib/billing.ts`의 `isPaidNow()` 한 곳에서만 합니다. 화면과 API는
`MemberProfile.tier`(유효 등급)만 보므로, 만료 처리를 각자 기억할 필요가 없습니다.

## 토스페이먼츠를 붙일 때

바꿔야 하는 것은 **승인 주체 하나**입니다. 구독 연장·이력은 이미 `activateOrder()`
한 곳에 모여 있어 그대로 재사용합니다.

**1. 키 발급 후 Vercel 환경변수에 추가**

| 이름 | 값 |
| --- | --- |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 클라이언트 키 (브라우저 노출 가능) |
| `TOSS_SECRET_KEY` | 시크릿 키 — **서버 전용, 저장소에 넣지 마십시오** |

**2. 결제창 호출** — `app/academy/billing/billing-client.tsx`의 `apply()`가
지금은 주문만 만들고 끝납니다. 여기서 받은 `orderId`·`amount`를 토스 SDK
결제창에 넘기고, 성공 리다이렉트를 `/academy/billing/confirm`으로 잡습니다.

**3. 승인 라우트 신설** — `app/api/billing/confirm/route.ts`

```
POST https://api.tosspayments.com/v1/payments/confirm
Authorization: Basic base64(TOSS_SECRET_KEY + ":")
{ paymentKey, orderId, amount }
```

승인 응답이 성공이면 그대로:

```ts
await activateOrder(order.id, { provider: "toss", providerKey: paymentKey });
```

**반드시 지킬 것 — 금액 위변조 방어.** 결제창에서 돌아온 `amount`를 그대로
믿지 말고, **DB의 주문 금액과 일치하는지 먼저 확인**한 뒤 승인하십시오. 이
검증을 빠뜨리면 100원짜리 결제로 연 이용권이 열립니다.

**4. 웹훅(선택)** — 가상계좌 입금처럼 나중에 확정되는 결제를 받으시려면
웹훅에서도 같은 `activateOrder()`를 부르면 됩니다. 재전송돼도 `pending`
주문에만 걸리므로 중복 연장이 일어나지 않습니다.

## 데이터베이스

`supabase/setup.sql`에 `orders` 테이블과 `members.paid_until`이 들어 있습니다.
이미 설정을 마치신 프로젝트라면 SQL Editor에서 이 부분만 실행하시면 됩니다
(여러 번 실행해도 안전합니다).
