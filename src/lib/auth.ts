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

import { prisma } from "@/lib/db";

/**
 * Ensure a Prisma User row exists mirroring the Supabase auth user (Stage 2).
 * Called before any operation that creates rows referencing userId, so a first-
 * time signed-in user never hits a foreign-key error.
 */
export async function ensureUser(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  try {
    await prisma.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email ?? null },
      update: { email: user.email ?? null },
    });
  } catch { /* best-effort; do not block the request */ }
  return user.id;
}
