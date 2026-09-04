export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getProvider, aiConfigured } from "@/lib/ai";
import { AnalyseSchema } from "@/lib/schemas";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { modelForTier } from "@/lib/ai/config";

/** POST /api/analyse — Layer 2 semantic analysis (§5). Returns validated JSON (§10). */
export async function POST(req: NextRequest) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI analysis unavailable. Local diagnostics still work." }, { status: 503 });
  const user = await getUser();
  const rl = rateLimit(`analyse:${user?.id || req.headers.get("x-forwarded-for") || "anon"}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = AnalyseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const tier = "STANDARD" as const;
  const started = Date.now();
  try {
    const result = await getProvider().analyse({ ...parsed.data, tier });
    await recordUsage({ userId: user?.id ?? null, operation: `analyse:${parsed.data.kind}`, model: modelForTier(tier), latencyMs: Date.now() - started, success: true });
    return NextResponse.json({ result });
  } catch (e) {
    await recordUsage({ userId: user?.id ?? null, operation: `analyse:${parsed.data.kind}`, model: modelForTier(tier), latencyMs: Date.now() - started, success: false });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Analysis failed." }, { status: 502 });
  }
}