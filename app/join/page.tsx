import type { Metadata } from "next";
import AuthForm from "../auth-form";
import AuthShell from "../auth-shell";

export const metadata: Metadata = {
  title: "회원 등록 | ㈜프론티어 M&A",
  description: "이메일로 등록하시면 실무 문제의 정답과 해설이 열립니다. 별도 비용은 없습니다.",
  robots: { index: false, follow: false },
};

export default function JoinPage() {
  return (
    <AuthShell>
      <AuthForm mode="join" />
    </AuthShell>
  );
}
