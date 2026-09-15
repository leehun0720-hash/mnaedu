/**
 * TEN AI 홈페이지 빌더 — 브랜드 한곳.
 *
 * 이 도구는 텐에이아이가 고객(중소기업·공공기관)에게 제공하는 서비스다.
 * 도구의 얼굴(이름·색·연락처)은 전부 이 파일에서 나온다. 로고를 바꾸거나
 * 연락처가 달라지면 여기만 고치면 되고, 빌더 본체는 건드릴 일이 없다.
 *
 * 출처: https://tenai.kr (2026-09-15 확인). 여기 적힌 것은 공개된 사실만이다 —
 * 실적·인증·수치를 지어내지 않는 것이 텐에이아이 문서의 제1원칙이다.
 */

export const BRAND = {
  /** 도구 이름 — 화면 왼쪽 위에 선다 */
  product: "홈페이지 빌더",
  productEn: "TEN AI SITE BUILDER",

  company: "TEN AI",
  companyKo: "텐에이아이",
  companyFull: "주식회사 텐에이아이",

  /** 사이트에서 그대로 가져온 문구 */
  tagline: "인간의 지혜와 실천이 만나는 10번째 인공지능",
  sloganEn: "The 10th Intelligence for Human Progress",
  slogan: "AI를 배우는 시대에서, AI로 배우는 시대로",

  site: "tenai.kr",
  siteHref: "https://tenai.kr",
  email: "leesh@tenai.kr",
  addressLines: ["서울시 서초구 서초동 1604-19", "대호프레조빌 202호"],

  /** 자체 한국어 특화 모델 */
  model: "TenOS-Ko-28B",
} as const;

/**
 * 텐에이아이 사이트가 실제로 쓰는 색. 빌더의 기본 테마와 도구 화면이 함께 쓴다.
 * 브랜드 색이 바뀌면 이 다섯 값만 고치면 도구와 결과물이 같이 따라온다.
 */
export const BRAND_COLORS = {
  /** 주색 — 단추·강조 */
  primary: "#0570DE",
  /** 깊은 감청 — 히어로·푸터 바탕 */
  deep: "#0A2540",
  /** 밝은 청록 — 보조 강조 */
  cyan: "#00D4FF",
  /** 연한 바탕 */
  paper: "#F6F9FC",
  /** 더 연한 강조 바탕 */
  tint: "#E8F4FD",
} as const;

/** 내보낸 HTML 에 남는 표시 — 누가 만든 도구인지 결과물이 스스로 말한다 */
export const GENERATOR = `${BRAND.productEn} (${BRAND.site})`;
