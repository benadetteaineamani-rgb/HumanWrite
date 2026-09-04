/**
 * EditorialAIProvider — the single seam every model call passes through (§6, §28).
 *
 * No UI component and no API route knows how to talk to Anthropic (or any other
 * vendor) directly. They depend only on this interface. Swapping Claude for
 * another model is implemented by adding a new provider, never by touching the
 * product. This is an architectural requirement, not a convenience.
 */

export type ModelTier = "FAST" | "STANDARD" | "DEEP";

export interface RewriteRequest {
  text: string;
  tasks: string[]; // e.g. ["fixOpenings", "removeRepetition", "preserveVoice"]
  mode: string; // Academic | Executive | Book / Long-form | Thought Leadership | Reflective
  intensity: string; // Proofread Only | Light Edit | Standard Edit | Strong Edit | Deep Editorial Rewrite
  voiceProfile?: VoiceProfile | null;
  voiceStrength?: number; // 0..100
  principles?: WritingPrinciple[]; // retrieved, relevant principles only (§17, §18)
  editorialContext?: string; // specification-aware context (Doc 1 §16)
  tier?: ModelTier;
}

export interface RewriteResponse {
  revised: string;
  notes?: string; // brief editorial note, optional
}

export interface AnalysisRequest {
  // semantic questions the local layer cannot answer (§5 Layer 2)
  kind:
    | "conceptual-repetition"
    | "sentence-contribution"
    | "paragraph-purpose"
    | "empty-storytelling";
  text: string;
  context?: string;
  tier?: ModelTier;
}

export interface AnalysisResponse {
  // structured, validated JSON (§10)
  [key: string]: unknown;
}

export interface EditorialQuestionRequest {
  question: string;
  text: string;
  tier?: ModelTier;
}

export interface EditorialAnswer {
  answer: string;
}

export interface VoiceProfileRequest {
  samples: string[]; // raw sample text; analysed once, then discarded (§15, §22)
}

export interface VoiceProfile {
  sentence_length?: Record<string, unknown>;
  sentence_architecture?: Record<string, unknown>;
  paragraph_density?: Record<string, unknown>;
  formality?: Record<string, unknown>;
  technicality?: Record<string, unknown>;
  first_person?: Record<string, unknown>;
  certainty?: Record<string, unknown>;
  rhetorical_questions?: Record<string, unknown>;
  metaphor_use?: Record<string, unknown>;
  transition_style?: Record<string, unknown>;
  preferred_spelling?: "British" | "American" | string;
  banned_patterns?: string[];
  distinctive_tendencies?: string[];
  summary?: string; // human-readable, editable by the user
}

export interface CompareStylesRequest {
  text: string;
  voices: string[]; // function categories, e.g. ["Academic","Executive","Narrative"]
  voiceProfiles?: Record<string, VoiceProfile>;
}

export interface StyleComparison {
  variants: { voice: string; text: string }[];
}

export interface WritingPrinciple {
  id: string;
  principle: string;
  appliesTo: string[];
  weak: string;
  response: string;
  doNot: string;
  confidence: string;
}

export interface EditorialAIProvider {
  rewrite(req: RewriteRequest): Promise<RewriteResponse>;
  analyse(req: AnalysisRequest): Promise<AnalysisResponse>;
  createVoiceProfile(req: VoiceProfileRequest): Promise<VoiceProfile>;
  compareStyles(req: CompareStylesRequest): Promise<StyleComparison>;
  editorialQuestion(req: EditorialQuestionRequest): Promise<EditorialAnswer>;
}
