export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getProvider, aiConfigured } from "@/lib/ai";
import { RewriteSchema } from "@/lib/schemas";
import { retrievePrinciples } from "@/lib/intelligence/retrieval";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { prisma } from "@/lib/db";
import { modelForTier } from "@/lib/ai/config";

/**
 * POST /api/rewrite — the central generative endpoint.
 *
 * Flow (§18): validate → retrieve relevant principles + voice → build request →
 * call provider → return PROPOSED revision (never auto-applied; the client shows
 * a diff and the user accepts/rejects, §19). If AI is unavailable, respond 503
 * with a clear message so the client keeps local tools working (§27).
 */
export async function POST(req: NextRequest) {
  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "AI editing is temporarily unavailable. Your document and local review tools are unaffected." },
      { status: 503 }
    );
  }

  const user = await getUser();
  const rlKey = user?.id || req.headers.get("x-forwarded-for") || "anon";
  const rl = rateLimit(`rewrite:${rlKey}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 30) } });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = RewriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  // Retrieve only relevant principles (§17, §18).
  const principles = retrievePrinciples({ documentType: input.documentType, tasks: input.tasks });

  // Specification-aware context: load the document's spec if we have a documentId.
  let editorialContext = "";
  try {
    const { buildEditorialContext } = await import("@/lib/intelligence/context");
    if ((input as { documentId?: string }).documentId) {
      const spec = await prisma.documentSpec.findUnique({ where: { documentId: (input as { documentId?: string }).documentId } });
      editorialContext = buildEditorialContext(spec as never);
    } else if (input.documentType) {
      editorialContext = buildEditorialContext({ writingType: input.documentType } as never);
    }
  } catch { /* context is best-effort; never block an edit */ }

  // Load voice profile if requested (stored server-side, §15) — never re-send raw samples.
  let voiceProfile = null;
  if (input.voiceProfileId && user) {
    const vp = await prisma.voiceProfile.findFirst({ where: { id: input.voiceProfileId, userId: user.id } });
    if (vp) voiceProfile = vp.profileJson as Record<string, unknown>;
  }

  const tier = input.tier || (input.scope === "document" ? "DEEP" : input.scope === "block" ? "STANDARD" : "FAST");
  const model = modelForTier(tier);
  const started = Date.now();
  try {
    const provider = getProvider();
    const result = await provider.rewrite({
      text: input.text,
      tasks: input.tasks,
      mode: input.mode,
      intensity: input.intensity,
      voiceProfile: voiceProfile as never,
      voiceStrength: input.voiceStrength,
      principles,
      editorialContext,
      tier,
    });
    await recordUsage({ userId: user?.id ?? null, operation: "rewrite", model, latencyMs: Date.now() - started, success: true });
    // Return proposal only; the client renders a diff and asks accept/reject (§19).
    return NextResponse.json({ proposal: result.revised, notes: result.notes ?? null });
  } catch (e) {
    await recordUsage({ userId: user?.id ?? null, operation: "rewrite", model, latencyMs: Date.now() - started, success: false });
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: `The edit could not complete: ${msg}. Your text is unchanged.` }, { status: 502 });
  }
}