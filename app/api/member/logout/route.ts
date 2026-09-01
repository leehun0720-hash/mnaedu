import { NextResponse } from "next/server";
import { memberCookie } from "@/lib/member-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Empty value with a zero lifetime: the browser drops it immediately
  res.headers.set("Set-Cookie", memberCookie("", 0));
  return res;
}
