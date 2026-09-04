import { getGenreProfile } from "./genres";

/**
 * Specification-aware editorial context (Doc 1 §16, Doc "What Are You Writing" §10).
 *
 * HumanWrite's editorial judgement comes from: what is being written + what it
 * should achieve + who it is for + the voice + writing intelligence + the actual
 * document. This turns a document's spec and writing type into a compact context
 * block appended to the AI system prompt — so rewrites respect purpose, audience,
 * protected terms and things to avoid, not just the raw text.
 *
 * It is supplied only to AI (semantic/generative) calls, never to local
 * deterministic diagnostics.
 */

export interface DocumentSpecData {
  writingType?: string;
  purpose?: string[];
  audience?: string[];
  targetAgeMin?: number | null;
  targetAgeMax?: number | null;
  intendedOutcome?: string | null;
  centralArgument?: string | null;
  keyPoints?: string[];
  tone?: string | null;
  avoid?: string[];
  requiredTerminology?: string[];
  protectedText?: string[];
  citationRequirements?: string | null;
  additionalInstructions?: string | null;
}

export function buildEditorialContext(spec: DocumentSpecData | null): string {
  const genre = getGenreProfile(spec?.writingType);
  const lines: string[] = [];

  lines.push(`WRITING TYPE: ${genre.name}. ${genre.aiGuidance}`);

  if (spec) {
    if (spec.purpose?.length) lines.push(`PURPOSE: ${spec.purpose.join(", ")}.`);
    if (spec.audience?.length) lines.push(`AUDIENCE: ${spec.audience.join(", ")}.`);
    if (spec.targetAgeMin || spec.targetAgeMax) {
      lines.push(`TARGET AGE: ${spec.targetAgeMin ?? "?"}–${spec.targetAgeMax ?? "?"}. Match vocabulary, sentence length and concepts to this age. Do not make it childish by mere synonym-swapping.`);
    }
    if (spec.centralArgument) lines.push(`CENTRAL ARGUMENT / MESSAGE: ${spec.centralArgument}. Assess whether the writing serves this.`);
    if (spec.intendedOutcome) lines.push(`INTENDED OUTCOME: ${spec.intendedOutcome}.`);
    if (spec.tone) lines.push(`TONE: ${spec.tone}.`);
    if (spec.requiredTerminology?.length) lines.push(`REQUIRED TERMINOLOGY (keep exactly, do not vary for style): ${spec.requiredTerminology.join(", ")}.`);
    if (spec.protectedText?.length) lines.push(`PROTECTED TEXT (never alter): ${spec.protectedText.join(" | ")}.`);
    if (spec.avoid?.length) lines.push(`AVOID: ${spec.avoid.join(", ")}. Flag or remove these where present.`);
    if (spec.citationRequirements) lines.push(`CITATIONS: ${spec.citationRequirements}. Never invent citation data.`);
    if (spec.additionalInstructions) lines.push(`ADDITIONAL: ${spec.additionalInstructions}`);
  }

  return lines.join("\n");
}

/** Genre diagnostic weights, for the local layer to scale finding severity. */
export function genreWeights(writingType?: string) {
  return getGenreProfile(writingType).diagnosticWeights;
}
