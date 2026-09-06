"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (Stage 2). Uses only the public anon key, which is
 * designed to be exposed to the browser. The database password and service key
 * are never here.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null; // auth not configured yet
  return createBrowserClient(url, key);
}
