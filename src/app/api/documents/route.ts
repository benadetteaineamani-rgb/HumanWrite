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
  if (!user) return NextResponse.json({ documents: [] });
  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    select: { id: true, title: true, documentType: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ documents });
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