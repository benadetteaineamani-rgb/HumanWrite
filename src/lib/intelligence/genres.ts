/**
 * Genre intelligence (Doc 3 & Doc "What Are You Writing").
 *
 * The central principle: HumanWrite must understand WHAT is being written before
 * deciding what good writing looks like. A genre profile changes the WEIGHT of
 * each diagnostic — repetition is a high concern in an executive report, context-
 * dependent in a children's story, and very low concern in poetry. This is far
 * more intelligent than one universal writing score.
 *
 * These profiles are consulted by the diagnostics layer (to weight findings) and
 * supplied to the AI as editorial context (so rewrites respect the genre).
 */

export interface GenreProfile {
  id: string;
  name: string;
  category: string;
  editorialPriorities: string[];
  acceptablePatterns: string[]; // patterns NOT to flag for this genre
  riskPatterns: string[];
  // diagnostic weights 0..1 — how much each issue matters for this genre
  diagnosticWeights: {
    repetition: number;
    parallelRepetition: number;
    formulaic: number;
    emptyStorytelling: number;
    openingDiversity: number;
    lowInformation: number;
  };
  aiGuidance: string; // appended to the editorial system prompt
}

const DEFAULT_WEIGHTS = {
  repetition: 0.6,
  parallelRepetition: 0.6,
  formulaic: 0.6,
  emptyStorytelling: 0.6,
  openingDiversity: 0.6,
  lowInformation: 0.6,
};

export const GENRE_PROFILES: Record<string, GenreProfile> = {
  thesis: {
    id: "thesis",
    name: "Thesis / Dissertation chapter",
    category: "Academic & Research",
    editorialPriorities: ["argument", "evidence", "synthesis", "methodological precision", "epistemic caution", "citation integrity"],
    acceptablePatterns: ["necessary technical-term repetition", "hedged claims", "long qualified sentences"],
    riskPatterns: ["inflated claims", "unnecessary summary", "unsupported certainty"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.4, parallelRepetition: 0.5, formulaic: 0.8, emptyStorytelling: 0.9, lowInformation: 0.8 },
    aiGuidance: "This is doctoral academic writing. Preserve necessary technical terminology even when repeated. Never raise epistemic certainty. Prioritise argument, evidence and methodological precision over stylistic variety.",
  },
  "academic-article": {
    id: "academic-article",
    name: "Journal article",
    category: "Academic & Research",
    editorialPriorities: ["contribution", "evidence", "clarity", "disciplinary rigour"],
    acceptablePatterns: ["technical-term repetition", "structured signposting"],
    riskPatterns: ["overclaiming", "vague reference", "restatement without interpretation"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.5, formulaic: 0.8, lowInformation: 0.8 },
    aiGuidance: "Academic journal article. Distinguish evidence from interpretation. Keep precise terminology. Avoid inflated claims.",
  },
  "novel": {
    id: "novel",
    name: "Novel / Literary fiction",
    category: "Fiction",
    editorialPriorities: ["character", "scene", "narrative movement", "voice", "pacing", "tension"],
    acceptablePatterns: ["deliberate repetition for rhythm", "sentence fragments", "vernacular", "motif recurrence"],
    riskPatterns: ["explaining emotion already shown", "atmosphere without event", "flat dialogue"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.3, parallelRepetition: 0.3, formulaic: 0.5, emptyStorytelling: 0.8, openingDiversity: 0.4 },
    aiGuidance: "Literary fiction. Do NOT apply academic rules. Repetition and fragments may be deliberate craft. Never explain an emotion a scene already conveys. Preserve narrative voice.",
  },
  "childrens-story": {
    id: "childrens-story",
    name: "Children's story",
    category: "Children's Writing",
    editorialPriorities: ["age appropriateness", "narrative clarity", "rhythm", "read-aloud quality", "purposeful repetition"],
    acceptablePatterns: ["purposeful repetition", "refrain", "simple parallel structure", "predictable patterning"],
    riskPatterns: ["vocabulary above target age", "abstract concepts", "flat rhythm"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.2, parallelRepetition: 0.15, formulaic: 0.4, openingDiversity: 0.2 },
    aiGuidance: "Children's writing. Repetition is often a STRENGTH here — refrains and patterning aid memory and read-aloud rhythm. Do not flag purposeful repetition. Match vocabulary and sentence length to the target age. Do not make it childish by mere synonym-swapping.",
  },
  "executive-report": {
    id: "executive-report",
    name: "Executive report",
    category: "Professional & Executive",
    editorialPriorities: ["decision relevance", "clarity", "brevity", "hierarchy", "recommendations"],
    acceptablePatterns: ["structured recommendations", "parallel bullet phrasing"],
    riskPatterns: ["unnecessary repetition", "throat-clearing", "buried recommendation", "vague hedging"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.9, parallelRepetition: 0.7, formulaic: 0.9, emptyStorytelling: 0.9, lowInformation: 0.9 },
    aiGuidance: "Executive report. Prioritise decision-relevance and brevity. Cut unnecessary repetition and throat-clearing. Move recommendations to the front.",
  },
  "linkedin": {
    id: "linkedin",
    name: "LinkedIn post",
    category: "Public & Thought Leadership",
    editorialPriorities: ["credible opening", "central insight", "authentic voice", "specificity"],
    acceptablePatterns: ["short paragraphs", "direct address", "a single deliberate rhetorical question"],
    riskPatterns: ["manufactured hooks", "empty motivational language", "forced inspiration", "excessive one-line paragraphs", "cliché"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, formulaic: 0.95, emptyStorytelling: 0.9 },
    aiGuidance: "LinkedIn post. Avoid manufactured hooks and forced inspiration. Keep the author's authentic voice. Do NOT force endless one-line paragraphs; sophisticated long-form is welcome.",
  },
  "poetry": {
    id: "poetry",
    name: "Poetry",
    category: "Creative & Other",
    editorialPriorities: ["image", "sound", "line", "compression"],
    acceptablePatterns: ["repetition", "anaphora", "fragments", "unconventional grammar", "refrain"],
    riskPatterns: [],
    diagnosticWeights: { repetition: 0.1, parallelRepetition: 0.05, formulaic: 0.3, emptyStorytelling: 0.2, openingDiversity: 0.05, lowInformation: 0.2 },
    aiGuidance: "Poetry. Repetition, anaphora and fragments are core devices, not errors. Intervene only with great restraint.",
  },
  "general": {
    id: "general",
    name: "General document",
    category: "General",
    editorialPriorities: ["clarity", "specificity", "coherence"],
    acceptablePatterns: [],
    riskPatterns: ["repetition", "formulaic phrasing", "empty sentences"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS },
    aiGuidance: "General-purpose writing. Apply balanced editorial judgement.",
  },
};

export function getGenreProfile(id?: string): GenreProfile {
  return (id && GENRE_PROFILES[id]) || GENRE_PROFILES.general;
}

export const WRITING_TYPE_CATEGORIES = [
  { category: "Academic & Research", types: ["thesis", "academic-article"] },
  { category: "Fiction", types: ["novel"] },
  { category: "Children's Writing", types: ["childrens-story"] },
  { category: "Professional & Executive", types: ["executive-report"] },
  { category: "Public & Thought Leadership", types: ["linkedin"] },
  { category: "Creative & Other", types: ["poetry"] },
  { category: "General", types: ["general"] },
];
