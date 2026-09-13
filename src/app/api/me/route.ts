export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Returns the current user's access status and admin flag, so the app can gate
 * PENDING users (Option A: blocked until approved) and reveal the admin panel
 * only to admins. ensureUser mirrors the Supabase account into our table on
 * first call, defaulting to PENDING.
 */
export async function GET() {
  const userId = await ensureUser();
  if (!userId) return NextResponse.json({ signedIn: false });
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isAdmin: true, accessStatus: true, plan: true },
  });
  return NextResponse.json({ signedIn: true, ...me });
}
