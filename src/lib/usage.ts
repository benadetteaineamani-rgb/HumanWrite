import { prisma } from "./db";

/**
 * Cost/usage recording (§21). Every model request records who, what, which
 * model, tokens, estimated cost, latency and outcome — so quotas and plans can
 * be added later without changing call sites. Never logs document contents (§20, §22).
 */
export async function recordUsage(params: {
  userId: string | null;
  operation: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  success: boolean;
}) {
  try {
    await prisma.usageEvent.create({
      data: {
        userId: params.userId ?? undefined,
        operation: params.operation,
        model: params.model,
        inputTokens: params.inputTokens ?? 0,
        outputTokens: params.outputTokens ?? 0,
        estimatedCost: estimateCost(params.model, params.inputTokens ?? 0, params.outputTokens ?? 0),
        latencyMs: params.latencyMs,
        success: params.success,
      },
    });
  } catch {
    // Telemetry must never break a user request.
  }
}

// Rough per-model cost table (USD per 1M tokens). Configurable later.
const COST: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5-20251001": { in: 0.8, out: 4 },
};
function estimateCost(model: string, inTok: number, outTok: number): number {
  const c = COST[model] || { in: 3, out: 15 };
  return (inTok / 1e6) * c.in + (outTok / 1e6) * c.out;
}
