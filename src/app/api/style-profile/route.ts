import { NextRequest, NextResponse } from "next/server";
import { getProvider, aiConfigured } from "@/lib/ai";
import { StyleProfileSchema } from "@/lib/schemas";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { modelForTier } from "@/lib/ai/config";
import { prisma } from "@/lib/db";

/**
 * POST /api/style-profile — analyse samples ONCE, derive a structured profile,
 * persist it server-side, and DISCARD the raw samples (§15, §22). The samples
 * are never stored and never re-sent on later edits.
 */
export async function POST(req: NextRequest) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a voice." }, { status: 401 });
  const rl = rateLimit(`voice:${user.id}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = StyleProfileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const started = Date.now();
  try {
    const profile = await getProvider().createVoiceProfile({ samples: parsed.data.samples });
    // Persist profile + sample count only; raw samples are discarded (§22).
    const saved = await prisma.voiceProfile.create({
      data: { userId: user.id, name: parsed.data.name, profileJson: profile as object, sampleCount: parsed.data.samples.length },
    });
    await recordUsage({ userId: user.id, operation: "style-profile", model: modelForTier("STANDARD"), latencyMs: Date.now() - started, success: true });
    return NextResponse.json({ id: saved.id, name: saved.name, profile });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 502 });
  }
}

/** GET — list the user's saved voices (profiles only, no samples). */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ voices: [] });
  const voices = await prisma.voiceProfile.findMany({ where: { userId: user.id }, select: { id: true, name: true, profileJson: true, sampleCount: true, updatedAt: true } });
  return NextResponse.json({ voices });
}
