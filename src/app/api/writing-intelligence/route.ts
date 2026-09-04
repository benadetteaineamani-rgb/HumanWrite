export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { WRITING_INTELLIGENCE_CATEGORIES, WRITING_PRINCIPLES, SOURCE_REGISTRY } from "@/lib/intelligence/principles";

/**
 * GET /api/writing-intelligence — exposes user-facing FUNCTION categories and
 * principles. Provenance/source registry is summarised as honest status only:
 * author names are never exposed as selectable voices (§16).
 */
export async function GET() {
  return NextResponse.json({
    categories: WRITING_INTELLIGENCE_CATEGORIES,
    principles: WRITING_PRINCIPLES.map((p) => ({ id: p.id, principle: p.principle, appliesTo: p.appliesTo, weak: p.weak, response: p.response, doNot: p.doNot })),
    corpus: {
      catalogued: SOURCE_REGISTRY.length,
      ingested: SOURCE_REGISTRY.filter((s) => s.ingested).length,
      rights: {
        GREEN: SOURCE_REGISTRY.filter((s) => s.rights === "GREEN").length,
        BLUE: SOURCE_REGISTRY.filter((s) => s.rights === "BLUE").length,
        AMBER: SOURCE_REGISTRY.filter((s) => s.rights === "AMBER").length,
        RED: SOURCE_REGISTRY.filter((s) => s.rights === "RED").length,
      },
    },
  });
}