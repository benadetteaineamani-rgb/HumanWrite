import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/ai";
import { prisma } from "@/lib/db";

/**
 * Health check (§26). Reports app, database and AI-provider status without
 * exposing secrets, so the client can tell AI-unavailable from DB-down from
 * network problems — never a vague "AI rewrites need Claude".
 */
export async function GET() {
  const status: Record<string, unknown> = { app: "ok", timestamp: new Date().toISOString() };

  status.ai = aiConfigured() ? "available" : "not-configured";

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = "connected";
  } catch {
    status.database = "unavailable";
  }

  const healthy = status.database === "connected";
  return NextResponse.json(status, { status: healthy ? 200 : 503 });
}
