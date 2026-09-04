export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { SpecSchema } from "@/lib/schemas";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Spec My Work persistence (Doc 1 §1, Doc 3). The spec is not mere metadata —
 * it is stored per document and later supplied to the AI as editorial context.
 */
export async function GET(req: NextRequest) {
  const documentId = req.nextUrl.searchParams.get("documentId");
  if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });
  const spec = await prisma.documentSpec.findUnique({ where: { documentId } });
  return NextResponse.json({ spec });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save a specification." }, { status: 401 });
  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = SpecSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid specification.", details: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const spec = await prisma.documentSpec.upsert({
    where: { documentId: d.documentId },
    create: d,
    update: d,
  });
  // keep the document's writingType in sync so diagnostics can weight by genre
  await prisma.document.update({ where: { id: d.documentId }, data: { writingType: d.writingType } }).catch(() => {});
  return NextResponse.json({ spec });
}