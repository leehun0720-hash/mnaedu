import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { members } from "@/db/schema";
import { getPublicQuestions } from "@/lib/questions";
import { MEMBER_COOKIE, readMemberSession } from "@/lib/member-auth";
import Home from "./home-client";

// Questions and the member session are both per-request, so the page cannot
// be baked at build time.
export const dynamic = "force-dynamic";

/** Resolved on the server so the page never flashes a signed-out state. */
async function currentMemberName(): Promise<string | null> {
  const jar = await cookies();
  const memberId = await readMemberSession(jar.get(MEMBER_COOKIE)?.value);
  if (memberId === null || !isDbConfigured()) return null;
  try {
    const [row] = await getDb()
      .select({ name: members.name })
      .from(members)
      .where(eq(members.id, memberId))
      .limit(1);
    return row?.name ?? null;
  } catch (err) {
    console.error("[page] member lookup failed:", err);
    return null;
  }
}

export default async function Page() {
  const [questions, memberName] = await Promise.all([
    getPublicQuestions(),
    currentMemberName(),
  ]);
  return <Home questions={questions} memberName={memberName} />;
}
