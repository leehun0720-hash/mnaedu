import type { Metadata } from "next";
import { getPublicQuestions } from "@/lib/questions-db";
import { getCurrentMember } from "@/lib/members";
import Home from "./home-client";

// Questions come from the database, so the page cannot be baked at build time
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "M&A 아카데미 | FRONTIER GROUP × TEN AI",
  description: "실력을 기르고 검증받는 곳 — 5레벨 문제·승급 체계로 실전 M&A 전문가를 선발하는 프리미엄 온라인 아카데미",
};

export default async function Page() {
  const [weeklyExams, member] = await Promise.all([getPublicQuestions(), getCurrentMember()]);
  return (
    <Home
      weeklyExams={weeklyExams}
      member={
        member && {
          name: member.name ?? member.email,
          tier: member.tier,
          points: member.points,
        }
      }
    />
  );
}
