/**
 * 상담 신청 — 입력 규칙과 상태.
 *
 * 회장 지적(2026-10-08): 문제를 읽다가 상담 신청을 했더니 화면이 첫 화면으로
 * 빠져나가고, 보낸 상담 내용을 어디서도 확인할 수 없었다. 전에는 양식이 메일
 * 프로그램을 여는 것으로 끝났다 — 보낸 사람 컴퓨터에 메일 프로그램이 없으면
 * 그대로 사라졌고, 회장이 모아 볼 자리도 없었다.
 *
 * 이제 상담 신청은 데이터베이스에 쌓이고, 관리자 화면 「상담 신청」 탭에서
 * 모아 보고 처리 상태를 옮긴다.
 *
 * 이 파일은 공개 양식(클라이언트)도 함께 쓰므로 데이터베이스를 건드리지
 * 않는다 — 저장과 조회는 lib/inquiries-db.ts 가 맡는다.
 */

/** 처리 상태 — 회장이 관리자 화면에서 옮긴다 */
export const INQUIRY_STATUSES = ["접수", "연락함", "상담중", "종료"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export function normalizeInquiryStatus(value: string | null | undefined): InquiryStatus {
  const v = (value ?? "").trim();
  return (INQUIRY_STATUSES as readonly string[]).includes(v) ? (v as InquiryStatus) : INQUIRY_STATUSES[0];
}

export const INQUIRY_LIMITS = {
  area: 40,
  name: 40,
  org: 80,
  phone: 40,
  email: 120,
  message: 4000,
  source: 200,
  memo: 2000,
} as const;

export type InquiryInput = {
  area?: string;
  name?: string;
  org?: string;
  phone?: string;
  email?: string;
  message?: string;
  source?: string;
  agree?: boolean;
};

export type InquiryValid = {
  area: string;
  name: string;
  org: string | null;
  phone: string | null;
  email: string;
  message: string;
  /** 어느 화면에서 보냈는지 — 회장이 무엇을 보고 연락했는지 알 수 있게 */
  source: string | null;
};

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * 보낸 화면 주소는 우리 사이트 안의 경로만 받는다.
 *
 * 관리자 화면에서 이 값을 눌러 그 화면으로 가 보시게 되므로, 바깥 주소나
 * 스크립트가 섞이면 안 된다.
 */
export function cleanSource(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v.startsWith("/") || v.startsWith("//")) return null;
  if (!/^\/[A-Za-z0-9\-._~/%?=&#]*$/.test(v)) return null;
  return v.slice(0, INQUIRY_LIMITS.source);
}

/**
 * 상담 신청을 받아도 되는지 본다. 고치지 않고 돌려보낸다 — 잘린 신청서보다
 * 다시 적어 달라는 쪽이 낫다.
 */
export function validateInquiry(input: InquiryInput): { error: string } | { value: InquiryValid } {
  const area = (input.area ?? "").trim() || "기타";
  if (area.length > INQUIRY_LIMITS.area) return { error: "문의 분야를 다시 골라 주십시오." };

  const name = (input.name ?? "").trim();
  if (name.length < 2) return { error: "성함을 적어 주십시오." };
  if (name.length > INQUIRY_LIMITS.name) return { error: "성함이 너무 깁니다." };

  const org = (input.org ?? "").trim();
  if (org.length > INQUIRY_LIMITS.org) return { error: "소속·직함이 너무 깁니다." };

  const phone = (input.phone ?? "").trim();
  if (phone.length > INQUIRY_LIMITS.phone) return { error: "연락처가 너무 깁니다." };

  const email = (input.email ?? "").trim();
  if (!looksLikeEmail(email)) return { error: "회신받으실 이메일 주소를 정확히 적어 주십시오." };
  if (email.length > INQUIRY_LIMITS.email) return { error: "이메일 주소가 너무 깁니다." };

  const message = (input.message ?? "").trim();
  if (message.length < 5) return { error: "문의 내용을 적어 주십시오." };
  if (message.length > INQUIRY_LIMITS.message) return { error: "문의 내용이 너무 깁니다." };

  if (!input.agree) return { error: "개인정보 수집·이용에 동의해 주셔야 접수됩니다." };

  return {
    value: {
      area,
      name,
      org: org || null,
      phone: phone || null,
      email,
      message,
      source: cleanSource(input.source),
    },
  };
}
