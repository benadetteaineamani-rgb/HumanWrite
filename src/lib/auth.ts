import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side auth (§14). Uses Supabase Auth. Returns the authenticated user or
 * null. Routes decide whether to require a user; AI routes work for signed-in
 * users, and document persistence requires one.
 */
export async function getUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null; // auth not configured (local dev without Supabase)
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
