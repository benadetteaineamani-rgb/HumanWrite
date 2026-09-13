export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { DocumentSchema } from "@/lib/schemas";
import { getUser, ensureUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Document persistence (§13). Authoritative copy lives in the database; the
 * client keeps IndexedDB only as an offline cache. Versions are persisted on
 * significant change.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ documents: [], shared: [] });
  const owned = await prisma.document.findMany({
    where: { userId: user.id },
    select: { id: true, title: true, documentType: true, plainText: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: "desc" },
  });
  // documents shared with this user (via membership), best-effort if table exists
  let shared: { id: string; title: string; documentType: string; role: string; updatedAt: Date }[] = [];
  try {
    const memberships = await prisma.documentMember.findMany({
      where: { userId: user.id },
      select: { role: true, document: { select: { id: true, title: true, documentType: true, updatedAt: true } } },
    });
    shared = memberships.map((m: { role: string; document: { id: string; title: string; documentType: string; updatedAt: Date } }) => ({ id: m.document.id, title: m.document.title, documentType: m.document.documentType, role: m.role as string, updatedAt: m.document.updatedAt }));
  } catch { /* collaboration tables not migrated yet */ }
  const documents = owned.map((d: { id: string; title: string; documentType: string; plainText: string; updatedAt: Date; createdAt: Date }) => ({
    id: d.id, title: d.title, documentType: d.documentType,
    words: (d.plainText || "").trim() ? (d.plainText || "").trim().split(/\s+/).length : 0,
    updatedAt: d.updatedAt, createdAt: d.createdAt,
  }));
  return NextResponse.json({ documents, shared });
}

export async function POST(req: NextRequest) {
  const userId = await ensureUser();
  if (!userId) return NextResponse.json({ error: "Sign in to save documents." }, { status: 401 });
  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = DocumentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid document." }, { status: 400 });
  const d = parsed.data;

  const saved = d.id
    ? await prisma.document.update({
        where: { id: d.id, userId },
        data: { title: d.title, documentType: d.documentType, contentJson: d.contentJson as object, plainText: d.plainText, activeVoiceProfileId: d.activeVoiceProfileId ?? null, writingMode: d.writingMode },
      })
    : await prisma.document.create({
        data: { userId, title: d.title, documentType: d.documentType, contentJson: d.contentJson as object, plainText: d.plainText, writingMode: d.writingMode },
      });

  // Persist a version snapshot (§13, §19).
  await prisma.documentVersion.create({
    data: { documentId: saved.id, label: "autosave", contentJson: d.contentJson as object },
  });

  return NextResponse.json({ id: saved.id, updatedAt: saved.updatedAt });
}