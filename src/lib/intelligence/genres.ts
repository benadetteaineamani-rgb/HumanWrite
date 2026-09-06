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
  // ---- Academic & Research (expanded) ----
  "literature-review": {
    id: "literature-review", name: "Literature review", category: "Academic & Research",
    editorialPriorities: ["synthesis", "critical comparison", "evidence", "gap identification"],
    acceptablePatterns: ["technical-term repetition", "author-year signposting"],
    riskPatterns: ["one-study-at-a-time summary", "listing without synthesis", "overclaiming"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.5, formulaic: 0.8, lowInformation: 0.85 },
    aiGuidance: "Literature review. Prioritise synthesis across sources over one-study-at-a-time summary. Distinguish evidence from interpretation. Keep precise terminology.",
  },
  "research-report": {
    id: "research-report", name: "Research report", category: "Academic & Research",
    editorialPriorities: ["clarity", "evidence", "structure", "findings-to-implications movement"],
    acceptablePatterns: ["technical-term repetition", "structured headings"],
    riskPatterns: ["restating evidence without interpretation", "vague reference"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, formulaic: 0.8, lowInformation: 0.8 },
    aiGuidance: "Research report. Move clearly from findings to implications. Keep evidence and interpretation distinct.",
  },

  // ---- Fiction (expanded) ----
  "short-story": {
    id: "short-story", name: "Short story", category: "Fiction",
    editorialPriorities: ["economy", "scene", "subtext", "restrained ending", "every detail earns its place"],
    acceptablePatterns: ["deliberate omission", "implication over statement", "fragments"],
    riskPatterns: ["explaining subtext", "over-resolution", "atmosphere without event"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.3, parallelRepetition: 0.3, emptyStorytelling: 0.8, openingDiversity: 0.4 },
    aiGuidance: "Short fiction. Every scene carries disproportionate weight. Do not explain subtext already shown. Endings need not resolve everything; intentional implication is a strength.",
  },
  "childrens-fiction": {
    id: "childrens-fiction", name: "Children's fiction", category: "Fiction",
    editorialPriorities: ["age appropriateness", "character", "rhythm", "read-aloud quality"],
    acceptablePatterns: ["purposeful repetition", "refrain", "predictable patterning"],
    riskPatterns: ["vocabulary above target age", "abstraction", "flat rhythm"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.2, parallelRepetition: 0.15, openingDiversity: 0.2 },
    aiGuidance: "Children's fiction. Repetition and refrain are strengths. Match vocabulary and sentence length to the reader's age.",
  },

  // ---- Non-fiction books (the family you asked for) ----
  "nonfiction-book": {
    id: "nonfiction-book", name: "Non-fiction book", category: "Non-fiction Book",
    editorialPriorities: ["intellectual argument", "reader progression", "evidence", "examples", "author voice", "chapter coherence"],
    acceptablePatterns: ["deliberate motif recurrence", "recurring key term", "narrative movement"],
    riskPatterns: ["turning a chapter into an academic paper", "unsupported assertion", "throat-clearing"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.5, formulaic: 0.75, emptyStorytelling: 0.7, lowInformation: 0.75 },
    aiGuidance: "Non-fiction book. Prioritise argument, reader progression, evidence and the author's voice. Do not turn a chapter into an academic paper; keep accessibility and narrative movement.",
  },
  "popular-science": {
    id: "popular-science", name: "Popular science", category: "Non-fiction Book",
    editorialPriorities: ["accurate explanation", "accessibility without oversimplification", "example-to-evidence-to-implication", "curiosity"],
    acceptablePatterns: ["necessary technical terms with explanation", "analogy that clarifies", "recurring key concept"],
    riskPatterns: ["distorting the science for simplicity", "false certainty", "jargon without explanation", "decorative analogy that clarifies nothing"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.45, formulaic: 0.8, emptyStorytelling: 0.7, lowInformation: 0.8 },
    aiGuidance: "Popular science. Explain technical ideas accurately without distortion. Accessibility is not oversimplification. Keep necessary terminology (defined), retain epistemic caution, and avoid analogies that decorate without clarifying.",
  },
  "business-book": {
    id: "business-book", name: "Business / Leadership", category: "Non-fiction Book",
    editorialPriorities: ["clear argument", "actionable insight", "credible evidence", "examples", "authority"],
    acceptablePatterns: ["recurring framework term", "structured takeaways"],
    riskPatterns: ["management cliché", "unsupported claim", "motivational filler", "formulaic list-padding"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, formulaic: 0.9, emptyStorytelling: 0.85, lowInformation: 0.85 },
    aiGuidance: "Business / leadership writing. Prioritise clear argument and actionable insight grounded in evidence. Cut management cliché, motivational filler and unsupported claims.",
  },
  "memoir": {
    id: "memoir", name: "Memoir", category: "Non-fiction Book",
    editorialPriorities: ["specific experience", "scene before interpretation", "earned reflection", "restraint", "consequence"],
    acceptablePatterns: ["deliberate repetition for rhythm", "recurring motif", "understatement"],
    riskPatterns: ["reflection before experience", "explaining emotion a scene already conveys", "abstract profundity without event"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.35, emptyStorytelling: 0.85, openingDiversity: 0.4 },
    aiGuidance: "Memoir. Reflection must be earned by specific experience — scene before interpretation. Never explain an emotion the scene already conveys. Do not invent events or details.",
  },
  "biography": {
    id: "biography", name: "Biography / Autobiography", category: "Non-fiction Book",
    editorialPriorities: ["narrative", "evidence", "character revealed through action", "context", "chronological clarity"],
    acceptablePatterns: ["recurring theme", "necessary date/name repetition"],
    riskPatterns: ["explaining character after a scene shows it", "unsupported claim about inner life"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, emptyStorytelling: 0.8, lowInformation: 0.75 },
    aiGuidance: "Biography. Reveal character through action, decision and consequence rather than assertion. Ground claims in evidence; never invent facts about a real person.",
  },
  "self-development": {
    id: "self-development", name: "Self-development", category: "Non-fiction Book",
    editorialPriorities: ["clear principle", "concrete example", "actionability", "honest framing"],
    acceptablePatterns: ["recurring principle term", "worked example"],
    riskPatterns: ["motivational cliché", "false promise", "empty inspiration", "unsupported claim"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, formulaic: 0.9, emptyStorytelling: 0.9, lowInformation: 0.85 },
    aiGuidance: "Self-development. Ground each principle in concrete example and honest framing. Cut motivational cliché, empty inspiration and unsupported promises.",
  },
  "narrative-nonfiction": {
    id: "narrative-nonfiction", name: "Narrative non-fiction", category: "Non-fiction Book",
    editorialPriorities: ["real narrative movement", "specific detail", "evidence", "scene and consequence"],
    acceptablePatterns: ["scene-setting that carries information", "recurring motif"],
    riskPatterns: ["manufactured drama", "atmosphere without event", "invented detail"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, emptyStorytelling: 0.85, formulaic: 0.7 },
    aiGuidance: "Narrative non-fiction. Real narrative movement requires something to happen. Distinguish genuine scene from manufactured dramatic language. Never invent detail to fill a scene.",
  },
  "investigative": {
    id: "investigative", name: "Investigative non-fiction", category: "Non-fiction Book",
    editorialPriorities: ["evidence", "sourcing", "clarity", "distinguishing fact from inference"],
    acceptablePatterns: ["necessary repetition of key facts", "careful attribution"],
    riskPatterns: ["asserting beyond evidence", "conflating inference with fact"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, formulaic: 0.8, lowInformation: 0.85 },
    aiGuidance: "Investigative writing. Keep fact distinct from inference; attribute carefully; never assert beyond the evidence.",
  },
  "textbook": {
    id: "textbook", name: "Textbook / Educational", category: "Non-fiction Book",
    editorialPriorities: ["accurate explanation", "logical progression", "clarity for the learner", "worked examples"],
    acceptablePatterns: ["deliberate repetition for reinforcement", "consistent terminology", "structured recap"],
    riskPatterns: ["ambiguity", "unexplained jargon", "inconsistent terms"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.4, formulaic: 0.7, lowInformation: 0.8 },
    aiGuidance: "Educational / textbook writing. Prioritise accuracy, logical progression and learner clarity. Repetition for reinforcement is legitimate; keep terminology consistent.",
  },

  // ---- Professional & Executive (expanded) ----
  "strategy-paper": {
    id: "strategy-paper", name: "Strategy paper", category: "Professional & Executive",
    editorialPriorities: ["decision relevance", "priorities", "risks", "clarity", "brevity"],
    acceptablePatterns: ["structured priorities", "parallel bullet phrasing"],
    riskPatterns: ["vague hedging", "buried decision", "unnecessary repetition"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.85, formulaic: 0.9, lowInformation: 0.9 },
    aiGuidance: "Strategy paper. Prioritise decisions, priorities and risks. Cut hedging and repetition; surface the recommendation.",
  },
  "proposal": {
    id: "proposal", name: "Proposal / White paper", category: "Professional & Executive",
    editorialPriorities: ["clear problem", "evidence", "proposed solution", "credibility", "concision"],
    acceptablePatterns: ["structured sections", "recurring key term"],
    riskPatterns: ["overclaiming", "filler", "vague benefit language"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, formulaic: 0.85, emptyStorytelling: 0.85, lowInformation: 0.85 },
    aiGuidance: "Proposal / white paper. State the problem clearly, support the solution with evidence, avoid overclaiming and vague benefit language.",
  },

  // ---- Public / Thought Leadership (expanded) ----
  "linkedin-article": {
    id: "linkedin-article", name: "LinkedIn article", category: "Public & Thought Leadership",
    editorialPriorities: ["genuine insight", "credible structure", "authentic voice", "specificity"],
    acceptablePatterns: ["headings", "considered long-form development"],
    riskPatterns: ["manufactured hooks", "empty inspiration", "cliché", "formulaic listicle padding"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, formulaic: 0.9, emptyStorytelling: 0.85 },
    aiGuidance: "LinkedIn article. A considered long-form piece, not a padded post. Keep authentic voice; avoid manufactured hooks and empty inspiration.",
  },
  "opinion": {
    id: "opinion", name: "Opinion / Commentary", category: "Public & Thought Leadership",
    editorialPriorities: ["clear position", "argument", "evidence", "distinctive perspective"],
    acceptablePatterns: ["rhetorical emphasis", "recurring theme"],
    riskPatterns: ["assertion without argument", "cliché", "strawman"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, formulaic: 0.85, lowInformation: 0.8 },
    aiGuidance: "Opinion / commentary. Take a clear position and argue it with evidence. Avoid cliché and unsupported assertion.",
  },
  "speech": {
    id: "speech", name: "Speech / Keynote", category: "Public & Thought Leadership",
    editorialPriorities: ["spoken rhythm", "clear through-line", "memorable specifics", "audience connection"],
    acceptablePatterns: ["deliberate repetition", "anaphora", "rhetorical parallelism", "refrain"],
    riskPatterns: ["dense unspeakable sentences", "abstraction without image"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.25, parallelRepetition: 0.2, formulaic: 0.7 },
    aiGuidance: "Speech / keynote. Repetition and anaphora are legitimate spoken-rhythm devices, not errors. Favour speakable sentences and concrete images.",
  },

  // ---- Educational ----
  "lesson": {
    id: "lesson", name: "Lesson / Teaching material", category: "Educational",
    editorialPriorities: ["clarity for learners", "logical steps", "examples", "age/level appropriateness"],
    acceptablePatterns: ["deliberate reinforcing repetition", "consistent terminology"],
    riskPatterns: ["ambiguity", "unexplained terms", "cognitive overload"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.35, formulaic: 0.7, lowInformation: 0.8 },
    aiGuidance: "Teaching material. Prioritise learner clarity and logical steps. Reinforcing repetition is legitimate; match level to the learner.",
  },

  // ---- Reflective / Personal ----
  "reflective": {
    id: "reflective", name: "Reflective / Personal essay", category: "Reflective / Personal",
    editorialPriorities: ["genuine introspection", "specificity", "restraint", "earned insight"],
    acceptablePatterns: ["deliberate repetition", "understatement", "recurring motif"],
    riskPatterns: ["manufactured profundity", "abstract statement before experience", "cliché"],
    diagnosticWeights: { ...DEFAULT_WEIGHTS, repetition: 0.35, emptyStorytelling: 0.85, formulaic: 0.85 },
    aiGuidance: "Reflective / personal essay. Insight must be earned by specific experience. Avoid manufactured profundity and abstract statements untethered from anything concrete.",
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
  { category: "Academic & Research", types: ["thesis", "academic-article", "literature-review", "research-report"] },
  { category: "Fiction", types: ["novel", "short-story", "childrens-fiction"] },
  { category: "Non-fiction Book", types: ["nonfiction-book", "popular-science", "business-book", "memoir", "biography", "self-development", "narrative-nonfiction", "investigative", "textbook"] },
  { category: "Children's Writing", types: ["childrens-story"] },
  { category: "Professional & Executive", types: ["executive-report", "strategy-paper", "proposal"] },
  { category: "Public & Thought Leadership", types: ["linkedin", "linkedin-article", "opinion", "speech"] },
  { category: "Educational", types: ["lesson"] },
  { category: "Reflective / Personal", types: ["reflective"] },
  { category: "Creative & Other", types: ["poetry"] },
  { category: "General", types: ["general"] },
];
