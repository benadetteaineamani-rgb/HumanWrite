import { WritingPrinciple } from "../ai/provider";

/**
 * Writing Intelligence Library (§16, §17). Curated principles — not templates,
 * not a fine-tuned model. Each records where it applies, how weakness shows, the
 * editorial response, and what never to do. These are retrieved selectively and
 * supplied to the model at request time.
 */
export const WRITING_PRINCIPLES: WritingPrinciple[] = [
  {
    id: "reflection-from-experience",
    principle:
      "Reflection is stronger when it grows from a specific experience rather than preceding one.",
    appliesTo: ["Memoir", "Reflective writing", "Personal essay", "Narrative non-fiction"],
    weak: "An abstract or philosophical statement arrives before any concrete observation or event.",
    response:
      "Ask whether the reflection can be grounded in a specific observation the passage already contains.",
    doNot: "Invent an event or detail for the writer.",
    confidence: "Editorial judgement",
  },
  {
    id: "evidence-vs-interpretation",
    principle:
      "Evidence and interpretation perform different functions; restating evidence is not interpreting it.",
    appliesTo: ["Scholarly precision", "Evidence and interpretation", "Investigative writing"],
    weak: "The passage repeats what the evidence says without stating what follows from it.",
    response: "Identify what the evidence establishes, then ask what interpretation it supports.",
    doNot: "Strengthen a claim beyond what the evidence carries.",
    confidence: "Strong signal",
  },
  {
    id: "emotion-need-not-be-named",
    principle: "Emotion need not be named when the scene has already communicated it.",
    appliesTo: ["Literary narrative", "Memoir", "Character and interior life"],
    weak: "A scene demonstrates an emotion and the next sentence explains the same emotion.",
    response: "Flag the explanatory sentence as possibly unnecessary and let the writer decide.",
    doNot: "Delete it automatically.",
    confidence: "Editorial judgement",
  },
  {
    id: "trust-the-work-done",
    principle:
      "Trust the work the writing has already done; a scene or a body of evidence rarely needs a sentence restating its point.",
    appliesTo: ["Narrative restraint", "Scholarly precision", "Reflective writing", "All forms"],
    weak: "A summarising or moralising sentence follows a passage that already made the point.",
    response: "Ask whether the closing sentence adds evidence, qualification or genuinely new interpretation.",
    doNot: "Remove it without offering the writer the choice.",
    confidence: "Strong signal",
  },
  {
    id: "specificity-locates",
    principle:
      "Concrete detail earns its place by locating the reader, establishing mood, revealing character or changing understanding — not by accumulating adjectives.",
    appliesTo: ["Sense of place", "Literary narrative", "Narrative non-fiction"],
    weak: "Descriptive detail accumulates without doing locating, revealing or foreshadowing work.",
    response: "Ask what each detail accomplishes and whether anything meaningful disappears if it is cut.",
    doNot: "Assume more adjectives means better description.",
    confidence: "Editorial judgement",
  },
  {
    id: "terminology-precision",
    principle:
      "A precise technical term may repeat because the concept remains the subject; synonym variation can reduce precision.",
    appliesTo: ["Scholarly precision", "Research made accessible", "Technical writing"],
    weak: "A necessary term is replaced by looser synonyms to avoid repetition.",
    response: "Keep the precise term where the concept is the subject; vary only where precision is not at stake.",
    doNot: "Flag necessary terminology as mere repetition.",
    confidence: "Strong signal",
  },
  {
    id: "implication-over-explicitness",
    principle: "Explicitness is not the same as clarity; intentional implication can be stronger than statement.",
    appliesTo: ["Short fiction", "Dialogue and subtext", "Literary narrative"],
    weak: "Subtext is explained immediately after it has been shown.",
    response: "Ask whether the reader already understands, and whether the explanation reduces the effect.",
    doNot: "Treat deliberate omission as unclear writing.",
    confidence: "Editorial judgement",
  },
];

/** User-facing function categories (§16) — writing functions, never author names. */
export const WRITING_INTELLIGENCE_CATEGORIES = [
  "Scholarly Precision",
  "Scholarly Synthesis",
  "Research Made Accessible",
  "Evidence and Interpretation",
  "Literary Narrative",
  "Narrative Restraint",
  "Sense of Place",
  "Character and Interior Life",
  "Dialogue and Subtext",
  "Short Fiction",
  "Memoir",
  "Reflective Writing",
  "Executive Writing",
  "Thought Leadership",
  "Children's Narrative",
];

/**
 * Internal source registry (§16). Provenance and rights only — NEVER surfaced as
 * selectable voices. Nothing here is ingested text; these are catalogue entries
 * with rights classification for future, rights-cleared corpus work.
 */
export interface SourceRecord {
  id: string;
  genre: string;
  rights: "GREEN" | "BLUE" | "AMBER" | "RED";
  licence: string;
  approvedForCorpus: boolean;
  approvedForAnalysisOnly: boolean;
  ingested: boolean;
  // provenance kept internal:
  title: string;
  author: string;
  url: string;
}

export const SOURCE_REGISTRY: SourceRecord[] = [
  {
    id: "src-essien-adler-2025",
    genre: "Scholarly synthesis",
    rights: "GREEN",
    licence: "CC BY 4.0",
    approvedForCorpus: true,
    approvedForAnalysisOnly: true,
    ingested: false,
    title: "Language in mathematics education in Africa",
    author: "Essien & Adler",
    url: "https://link.springer.com/article/10.1007/s11858-025-01698-9",
  },
  // Additional catalogue entries (BLUE/AMBER) are added as rights are verified.
  // All remain ingested:false until real, rights-cleared retrieval occurs.
];
