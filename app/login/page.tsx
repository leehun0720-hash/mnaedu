import type { Metadata } from "next";
import AuthForm from "../auth-form";
import AuthShell from "../auth-shell";

export const metadata: Metadata = {
  title: "로그인 | ㈜프론티어 M&A",
  description: "정답과 해설을 보시려면 로그인해 주십시오.",
  // 가입·로그인 화면은 검색에 걸릴 이유가 없다
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  );
}
