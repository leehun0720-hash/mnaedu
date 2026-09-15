/**
 * 「관리자」로 가는 길 — 회장 지시(2026-09-15): 하단과 네비게이션 바 양쪽에.
 *
 * 한 곳에 두는 이유: 화면마다 따로 적으면 하나를 고칠 때 다른 하나를 잊는다.
 * 새 창으로 연다(출제 도중 보시던 화면이 사라지지 않게). Link 대신 <a> 인 것은
 * 새 창이 클라이언트 전환이 아니라 새 문서이기 때문이다. /admin 은 자체 noindex
 * 이고 여기서도 nofollow 를 단다.
 */
export default function AdminLink({ variant }: { variant: "nav" | "footer" }) {
  const cls = variant === "nav" ? "co-nav-admin" : "footer-admin";
  return (
    <a className={cls} href="/admin" target="_blank" rel="nofollow noopener noreferrer">
      관리자 <i aria-hidden="true">↗</i>
    </a>
  );
}
