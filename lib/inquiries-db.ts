import "server-only";

import { and, count, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { inquiries } from "@/db/schema";
import { INQUIRY_LIMITS, INQUIRY_STATUSES, normalizeInquiryStatus, type InquiryValid } from "@/lib/inquiry";

/**
 * 상담 신청 — 저장과 조회.
 *
 * 공개 화면으로 나가는 조회는 없다. 신청자가 받는 것은 접수 번호 하나뿐이고,
 * 나머지는 모두 관리자 세션을 거친 경로에서만 읽는다.
 */

/**
 * 표가 없으면 만든다 — 회장이 SQL 을 다시 돌리지 않으셔도 되게.
 *
 * setup.sql 을 돌리다 표가 잠긴 일(2026-10-02)이 있었다. 새 표 하나 때문에 그
 * 절차를 또 밟으시게 하지 않는다. 다만 잠금은 setup.sql 2부와 똑같이 건다 —
 * RLS 를 켜고, 브라우저 쪽 역할(anon · authenticated)의 권한을 모두 회수한다.
 * 이 표에는 성함과 연락처, 거래 이야기가 담긴다.
 *
 * 있는지 먼저 묻고(잠금 없이), 없을 때만 만든다. 만드는 일은 트랜잭션 하나로
 * 묶어 표만 생기고 잠금이 빠지는 틈이 없게 한다.
 */
let tableReady = false;

export async function ensureInquiriesTable(): Promise<void> {
  if (tableReady || !isDbConfigured()) return;
  const db = getDb();
  const found = (await db.execute(sql`select to_regclass('public.inquiries') is not null as ok`)) as unknown as {
    ok: boolean;
  }[];
  if (found[0]?.ok) {
    tableReady = true;
    return;
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(sql`
      create table if not exists "inquiries" (
        "id" serial primary key not null,
        "area" text not null,
        "name" text not null,
        "org" text,
        "phone" text,
        "email" text not null,
        "message" text not null,
        "source" text,
        "status" text default '접수' not null,
        "memo" text,
        "created_at" timestamp with time zone default now() not null,
        "updated_at" timestamp with time zone default now() not null
      )
    `);
    await tx.execute(
      sql`create index if not exists "inquiries_status_idx" on "inquiries" using btree ("status","created_at")`
    );
    await tx.execute(sql`alter table "inquiries" enable row level security`);
    // 역할이 없는 데이터베이스(검사용 등)에서도 넘어지지 않게, 있는 역할에서만 회수한다
    await tx.execute(sql`
      do $$
      begin
        if exists (select 1 from pg_roles where rolname = 'anon') then
          revoke all on table "inquiries" from anon;
          revoke all on sequence "inquiries_id_seq" from anon;
        end if;
        if exists (select 1 from pg_roles where rolname = 'authenticated') then
          revoke all on table "inquiries" from authenticated;
          revoke all on sequence "inquiries_id_seq" from authenticated;
        end if;
      end
      $$
    `);
  });
  tableReady = true;
}

/** 같은 이메일로 한 시간에 다섯 건까지 — 두 번 눌림과 밀어 넣기를 함께 막는다 */
export async function inquiredTooOften(email: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    await ensureInquiriesTable();
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [row] = await getDb()
      .select({ value: count() })
      .from(inquiries)
      .where(and(eq(inquiries.email, email), gte(inquiries.createdAt, since)));
    return (row?.value ?? 0) >= 5;
  } catch (err) {
    // 확인에 실패했다고 접수를 막지는 않는다 — 접수가 먼저다
    console.error("[inquiry] rate check failed:", err);
    return false;
  }
}

export async function createInquiry(value: InquiryValid): Promise<number | null> {
  if (!isDbConfigured()) return null;
  await ensureInquiriesTable();
  const [row] = await getDb()
    .insert(inquiries)
    .values({
      area: value.area,
      name: value.name,
      org: value.org,
      phone: value.phone,
      email: value.email,
      message: value.message,
      source: value.source,
    })
    .returning({ id: inquiries.id });
  return row?.id ?? null;
}

/* ── 관리자 쪽 ───────────────────────────────────────────── */

export const INQUIRY_PAGE_SIZE = 20;

export type AdminInquiry = {
  id: number;
  area: string;
  name: string;
  org: string | null;
  phone: string | null;
  email: string;
  message: string;
  source: string | null;
  status: string;
  memo: string | null;
  createdAt: string;
};

export type AdminInquiryList = {
  rows: AdminInquiry[];
  total: number;
  page: number;
  pageSize: number;
  /** 상태별 건수 — 남은 일의 지도 */
  byStatus: Record<string, number>;
};

/** 한국 시각으로 「2026-10-08 14:05」 — 언제 들어온 신청인지가 처리 순서를 정한다 */
function stamp(d: Date): string {
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return k.toISOString().slice(0, 16).replace("T", " ");
}

export async function listInquiries(q: string, status: string, page: number): Promise<AdminInquiryList> {
  await ensureInquiriesTable();
  const db = getDb();
  const filters: SQL[] = [];
  if (q) {
    const like = `%${q}%`;
    const match = or(
      ilike(inquiries.name, like),
      ilike(inquiries.org, like),
      ilike(inquiries.email, like),
      ilike(inquiries.phone, like),
      ilike(inquiries.message, like),
      ilike(inquiries.area, like)
    );
    if (match) filters.push(match);
  }
  if ((INQUIRY_STATUSES as readonly string[]).includes(status)) filters.push(eq(inquiries.status, status));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [totals], statusRows] = await Promise.all([
    db
      .select()
      .from(inquiries)
      .where(where)
      .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
      .limit(INQUIRY_PAGE_SIZE)
      .offset((page - 1) * INQUIRY_PAGE_SIZE),
    db.select({ value: count() }).from(inquiries).where(where),
    db.select({ status: inquiries.status, value: count() }).from(inquiries).groupBy(inquiries.status),
  ]);

  const byStatus: Record<string, number> = Object.fromEntries(INQUIRY_STATUSES.map((s) => [s, 0]));
  for (const r of statusRows) byStatus[r.status] = r.value;

  return {
    rows: rows.map((r) => ({
      id: r.id,
      area: r.area,
      name: r.name,
      org: r.org,
      phone: r.phone,
      email: r.email,
      message: r.message,
      source: r.source,
      status: r.status,
      memo: r.memo,
      createdAt: stamp(r.createdAt),
    })),
    total: totals?.value ?? 0,
    page,
    pageSize: INQUIRY_PAGE_SIZE,
    byStatus,
  };
}

/** 아직 손대지 않은 신청 건수 — 관리자 탭 이름 옆에 띄운다 */
export async function countNewInquiries(): Promise<number> {
  await ensureInquiriesTable();
  const [row] = await getDb().select({ value: count() }).from(inquiries).where(eq(inquiries.status, "접수"));
  return row?.value ?? 0;
}

export async function updateInquiry(
  id: number,
  patch: { status?: string; memo?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const set: { status?: string; memo?: string | null; updatedAt: Date } = { updatedAt: new Date() };
  if (patch.status !== undefined) set.status = normalizeInquiryStatus(patch.status);
  if (patch.memo !== undefined) {
    const memo = (patch.memo ?? "").trim();
    if (memo.length > INQUIRY_LIMITS.memo) return { ok: false, error: "메모가 너무 깁니다." };
    set.memo = memo || null;
  }
  await ensureInquiriesTable();
  const [row] = await getDb().update(inquiries).set(set).where(eq(inquiries.id, id)).returning({ id: inquiries.id });
  return { ok: Boolean(row) };
}

export async function deleteInquiry(id: number): Promise<void> {
  await ensureInquiriesTable();
  await getDb().delete(inquiries).where(eq(inquiries.id, id));
}
