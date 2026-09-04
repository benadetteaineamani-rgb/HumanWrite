export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getProvider, aiConfigured } from "@/lib/ai";
import { CompareStylesSchema } from "@/lib/schemas";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { recordUsage } from "@/lib/usage";
import { modelForTier } from "@/lib/ai/config";

/** POST /api/compare-styles — same passage in several voices, generated concurrently (§17). */
export async function POST(req: NextRequest) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI unavailable." }, { status: 503 });
  const user = await getUser();
  const rl = rateLimit(`cmp:${user?.id || req.headers.get("x-forwarded-for") || "anon"}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const parsed = CompareStylesSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const started = Date.now();
  try {
    const result = await getProvider().compareStyles(parsed.data);
    await recordUsage({ userId: user?.id ?? null, operation: "compare-styles", model: modelForTier("STANDARD"), latencyMs: Date.now() - started, success: true });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 502 });
  }
}