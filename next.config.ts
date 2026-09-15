import type { NextConfig } from "next";

/**
 * 도메인: www.frontierexpert.com (회장 지시 2026-09-15).
 *
 * 주소는 코드가 아니라 요청에서 읽는다 — layout·sitemap·robots 가 요청의 host 를
 * 그대로 쓰므로, DNS 가 붙는 순간 canonical·OG·sitemap 이 새 주소로 나간다.
 * 여기서는 한 가지만 못 박는다: 앞에 www 가 없는 주소로 들어오면 www 로 보낸다.
 * 검색엔진이 두 주소를 다른 사이트로 세지 않게 하기 위해서다.
 *
 * mnaedu.vercel.app → www 로 보내는 일은 DNS 가 살아 있는 것을 확인한 뒤 Vercel
 * 의 Domains 설정에서 켠다. 미리 켜 두면 DNS 가 붙기 전에 사이트가 끊긴다.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "frontierexpert.com" }],
        destination: "https://www.frontierexpert.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
