import type { Stage } from "@/lib/questions";

/**
 * 자료실 한 줄 — 내려받는 파일이거나, 그 자리에서 읽는 글이다.
 *
 * 두 표(documents · articles)에서 오므로 id가 겹친다. 화면 key 로 쓸 값을
 * 따로 들고 다닌다.
 */
export type LibraryEntry = {
  key: string;
  title: string;
  summary: string | null;
  /** 자료 | 칼럼 | 글 */
  kind: string;
  stage: Stage | null;
  trackLabel: string | null;
  /** YYYY-MM-DD */
  createdAt: string;
  /** 파일이면 내려받는 주소, 글이면 읽는 주소 */
  href: string;
  /** 참이면 내려받기, 거짓이면 읽기 */
  file: boolean;
  /** 파일일 때만 — "1.2 MB" */
  size: string;
};

/**
 * 두 목록을 날짜순으로 합쳐 한 쪽 분량만 자른다.
 *
 * 한 쪽만 미리 끊어 오면 합친 뒤 순서가 어긋나므로, 부르는 쪽이 양쪽에서
 * '이 쪽까지 필요한 만큼'(offset + limit)을 가져오고 자르는 일은 여기서 한다.
 * 계산만 하므로 저장소 없이 그대로 시험할 수 있다.
 */
export function mergeLibrary(entries: LibraryEntry[], limit: number, offset: number): LibraryEntry[] {
  // 날짜가 같으면 글을 앞에 둔다 — 같은 날 올리신 것 중에는 읽을 것이 먼저다
  const sorted = [...entries].sort((a, b) =>
    a.createdAt === b.createdAt
      ? Number(a.file) - Number(b.file)
      : a.createdAt < b.createdAt
        ? 1
        : -1
  );
  return sorted.slice(offset, offset + limit);
}
