import { WritingPrinciple } from "../ai/provider";
import { WRITING_PRINCIPLES } from "./principles";

/**
 * Retrieval layer (§17, §18). For each editorial request we retrieve ONLY the
 * principles relevant to the document purpose, scope, task and detected issue —
 * never the whole library. This keeps prompts small, focused and cheap, and it
 * is the mechanism by which Writing Intelligence informs editing without
 * retraining any model.
 */

export interface RetrievalContext {
  documentType?: string; // e.g. "Academic Article", "Memoir"
  tasks?: string[]; // e.g. ["fixOpenings","removeRepetition"]
  issue?: string; // e.g. "conceptual-repetition", "empty-storytelling"
}

// Map editorial tasks / issues to the principle ids most relevant to them.
const TASK_TO_PRINCIPLES: Record<string, string[]> = {
  removeRepetition: ["terminology-precision", "trust-the-work-done"],
  removeEmpty: ["evidence-vs-interpretation", "trust-the-work-done"],
  removeStorytelling: ["emotion-need-not-be-named", "specificity-locates"],
  clarify: ["evidence-vs-interpretation"],
  strengthenArgument: ["evidence-vs-interpretation"],
  fixOpenings: [],
  tighten: ["trust-the-work-done"],
  "conceptual-repetition": ["terminology-precision", "trust-the-work-done"],
  "empty-storytelling": ["emotion-need-not-be-named", "specificity-locates"],
  "sentence-contribution": ["evidence-vs-interpretation", "trust-the-work-done"],
};

const DOCTYPE_HINTS: Record<string, string[]> = {
  Memoir: ["reflection-from-experience", "emotion-need-not-be-named"],
  "Reflective writing": ["reflection-from-experience", "implication-over-explicitness"],
  "Academic Article": ["evidence-vs-interpretation", "terminology-precision"],
  "Short fiction": ["implication-over-explicitness", "emotion-need-not-be-named"],
};

export function retrievePrinciples(ctx: RetrievalContext): WritingPrinciple[] {
  const ids = new Set<string>();
  (ctx.tasks || []).forEach((t) =>
    (TASK_TO_PRINCIPLES[t] || []).forEach((id) => ids.add(id))
  );
  if (ctx.issue) (TASK_TO_PRINCIPLES[ctx.issue] || []).forEach((id) => ids.add(id));
  if (ctx.documentType)
    (DOCTYPE_HINTS[ctx.documentType] || []).forEach((id) => ids.add(id));

  const selected = WRITING_PRINCIPLES.filter((p) => ids.has(p.id));
  // Cap the number sent so prompts stay small (§17: not the whole library).
  return selected.slice(0, 4);
}
