export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Admin API (pilot onboarding). Lists users and lets an admin approve/reject
 * access and grant/revoke admin. Every call is guarded: the caller must be a
 * signed-in user whose own record has isAdmin = true. Enforced server-side.
 */
async function requireAdmin() {
  const user = await getUser();
  if (!user) return null;
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { isAdmin: true } });
  return me?.isAdmin ? user.id : null;
}

export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, isAdmin: true, accessStatus: true, plan: true, createdAt: true, approvedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const b = body as { userId?: string; action?: string };
  if (!b.userId || !b.action) return NextResponse.json({ error: "userId and action required." }, { status: 400 });

  // Guard: an admin cannot reject or de-admin themselves (avoid lockout).
  if (b.userId === adminId && (b.action === "reject" || b.action === "revokeAdmin")) {
    return NextResponse.json({ error: "You cannot remove your own access or admin rights." }, { status: 400 });
  }

  const data =
    b.action === "approve" ? { accessStatus: "APPROVED", approvedAt: new Date() } :
    b.action === "reject" ? { accessStatus: "REJECTED" } :
    b.action === "makeAdmin" ? { isAdmin: true } :
    b.action === "revokeAdmin" ? { isAdmin: false } : null;
  if (!data) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const updated = await prisma.user.update({ where: { id: b.userId }, data, select: { id: true, accessStatus: true, isAdmin: true } });
  return NextResponse.json({ user: updated });
}
