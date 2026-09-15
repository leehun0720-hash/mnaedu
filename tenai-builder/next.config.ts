import path from "node:path";
import type { NextConfig } from "next";

/**
 * 빌더는 브라우저 안에서만 도는 도구다 — 서버 API 도, 데이터베이스도 없다.
 * 그래서 설정도 거의 비어 있는 것이 맞다.
 *
 * turbopack.root 만 못 박아 둔다. 이 앱은 상위 저장소 안에 있으면서도 자기
 * 설치본을 따로 가지므로, 뿌리를 정해 주지 않으면 빌드가 위쪽 잠금 파일을 보고
 * 엉뚱한 곳을 뿌리로 삼는다.
 */
const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
