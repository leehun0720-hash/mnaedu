"use client";

import dynamic from "next/dynamic";
// 대기 화면도 같은 스타일을 써야 한다 — 빌더 본체는 아직 도착하지 않았다
import "./builder.css";

/**
 * 빌더는 브라우저 안에서만 산다 — 문서를 브라우저 저장소에서 읽고, 구역마다
 * 그때그때 만든 id를 붙인다. 서버에서 미리 그려 두면 서버가 만든 id와 브라우저가
 * 만든 id가 어긋나 화면이 통째로 갈아 끼워지고, 그때 편집 표시가 지워진다.
 * 그래서 서버 렌더링을 끄고 브라우저에서만 그린다.
 */
const BuilderClient = dynamic(() => import("./builder-client"), {
  ssr: false,
  loading: () => <div className="bx-boot">빌더를 준비하는 중…</div>,
});

export default function BuilderShell() {
  return <BuilderClient />;
}
