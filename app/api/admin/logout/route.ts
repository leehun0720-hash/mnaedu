import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Empty value with a zero lifetime clears it
  res.headers.set("Set-Cookie", sessionCookie("", 0));
  return res;
}
