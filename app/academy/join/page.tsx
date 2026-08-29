import type { Metadata } from "next";
import AuthForm from "../auth-form";
import AuthShell from "../auth-shell";

export const metadata: Metadata = {
  title: "회원가입 | M&A 아카데미",
  description: "M&A 아카데미 회원가입 — 무료회원은 L1 입문 퀴즈를 풀 수 있습니다.",
  // 가입·로그인 화면은 검색에 걸릴 이유가 없다
  robots: { index: false, follow: false },
};

export default function JoinPage() {
  return (
    <AuthShell>
      <AuthForm mode="join" />
    </AuthShell>
  );
}
