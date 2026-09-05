import type { Metadata } from "next";
import BuilderShell from "./builder-shell";

/**
 * 홈페이지 빌더 — 이 사이트의 골격과 디자인 체계를 부품으로 쪼갠 편집 도구.
 *
 * 문서는 전부 보는 사람의 브라우저에만 남는다(서버에 저장하지 않는다).
 * 결과물은 HTML 한 장으로 내보내 어디에나 올릴 수 있다.
 */
export const metadata: Metadata = {
  title: "홈페이지 빌더 | FRONTIER SITE BUILDER",
  description: "구역을 쌓아 홈페이지를 만들고 HTML 한 장으로 내보내는 편집 도구",
  // 도구이지 홍보 페이지가 아니다 — 검색에 걸리지 않게 한다
  robots: { index: false, follow: false },
};

export default function BuilderPage() {
  return <BuilderShell />;
}
