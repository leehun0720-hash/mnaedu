"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isAuthConfigured } from "./config";

/** 브라우저에서 쓰는 Supabase 클라이언트. 미설정이면 null을 준다. */
export function getSupabaseBrowser() {
  if (!isAuthConfigured()) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export { isAuthConfigured };
