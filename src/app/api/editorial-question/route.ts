import { NextRequest, NextResponse } from "next/server";
import { getProvider, aiConfigured } from "@/lib/ai";
import { EditorialQuestionSchema } from "@/lib/schemas";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { modelForTier } from "@/lib/ai/config";

/** POST /api/editorial-question — "What is this paragraph saying?" etc. (FAST tier). */
export async function POST(req: NextRequest) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI unavailable. Local diagnostics still work." }, { status: 503 });
  const user = await getUser();
  const rl = rateLimit(`eq:${user?.id || req.headers.get("x-forwarded-for") || "anon"}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = EditorialQuestionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const started = Date.now();
  try {
    const result = await getProvider().editorialQuestion({ ...parsed.data, tier: "FAST" });
    await recordUsage({ userId: user?.id ?? null, operation: "editorial-question", model: modelForTier("FAST"), latencyMs: Date.now() - started, success: true });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 502 });
  }
}
