import type { Metadata } from "next";
import AuthForm from "../auth-form";
import AuthShell from "../auth-shell";

export const metadata: Metadata = {
  title: "로그인 | ㈜프론티어 M&A",
  description: "정답과 해설을 보시려면 로그인해 주십시오.",
  // 가입·로그인 화면은 검색에 걸릴 이유가 없다
  robots: { index: false, follow: false },
};

/**
 * 인증 링크가 돌아오다 실패하면 이 화면으로 온다. 왜 실패했는지 한 줄이라도
 * 있어야 다시 시도하실 수 있다 — 빈 로그인 화면만 띄우면 인증을 마쳤다고
 * 믿는 분이 이유도 모른 채 되돌아간다.
 */
const AUTH_NOTICE: Record<string, string> = {
  othertab:
    "인증 링크가 가입하신 브라우저가 아닌 곳에서 열렸습니다. 메일 앱 안에서 열리면 자주 생기는 일입니다. 링크를 길게 눌러 주소를 복사하신 뒤, 가입하실 때 쓰신 브라우저에 붙여넣어 주십시오.",
  expired:
    "인증 링크가 만료되었거나 이미 사용되었습니다. 아래에서 로그인해 보시고, 「인증 링크를 먼저 눌러 주십시오」가 나오면 회원가입을 다시 진행해 새 링크를 받아 주십시오.",
  nocode: "인증 정보가 없이 돌아왔습니다. 메일의 링크를 다시 한 번 눌러 주십시오.",
  unconfigured: "회원 시스템 설정이 끝나지 않았습니다. 관리자에게 알려 주십시오.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;
  const notice = auth ? AUTH_NOTICE[auth] : undefined;

  return (
    <AuthShell>
      {notice && (
        <p className="auth-callout" role="alert">
          {notice}
        </p>
      )}
      <AuthForm mode="login" />
    </AuthShell>
  );
}
