import Link from "next/link";
import CopyGuard from "../copy-guard";
import ThemeToggle from "../theme-toggle";

/** 가입·로그인·내 학습 화면이 함께 쓰는 어두운 톤의 좁은 셸 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <CopyGuard />
      <ThemeToggle />
      <header className="auth-top">
        <Link className="auth-brand" href="/academy">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, pre-sized */}
          <img src="/logo-frontier-group-white.svg" alt="" width={30} height={26} aria-hidden="true" />
          <span>
            FRONTIER M&amp;A
            <i>M&amp;A 아카데미</i>
          </span>
        </Link>
        <Link className="auth-back" href="/academy">
          아카데미로 <span aria-hidden="true">→</span>
        </Link>
      </header>
      <main className="auth-main">{children}</main>
      <footer className="auth-foot">
        <small>© 2026 ㈜프론티어 M&amp;A</small>
        <small>
          <Link href="/academy/help">이용 안내</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy">개인정보처리방침</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/">메인</Link>
        </small>
      </footer>
    </div>
  );
}
