/**
 * HumanWrite document model (Stage 1 §1, §2, §18–§22).
 *
 * This is the architectural spine. Stage 1 renders only paragraphs, headings,
 * lists, blockquotes and basic marks — but the model already NAMES every node
 * type the full product will need, so later stages (tables, equations, diagrams,
 * charts, citations, footnotes, page/section breaks) are added as editor
 * extensions WITHOUT another editor migration.
 *
 * Two principles enforced here:
 *  1. Every meaningful block carries a STABLE ID (diagnostics, comments,
 *     revisions and AI edits will reference blocks by id).
 *  2. Semantic structure is kept separate from presentation/theme (§2, §21):
 *     a "heading1" is structurally a heading regardless of which publication
 *     theme later renders it.
 */

export type HumanWriteNodeType =
  | "paragraph"
  | "heading"
  | "blockquote"
  | "bulletList"
  | "orderedList"
  | "listItem"
  | "table"
  | "image"
  | "equation" // Stage 5+: LaTeX/MathML, not a screenshot (§19)
  | "diagram" // Stage 5+: structured editable source, not an image (§20)
  | "chart"
  | "citation"
  | "footnote"
  | "figure"
  | "callout"
  | "codeBlock"
  | "pageBreak"
  | "sectionBreak";

/** A serialisable block with a stable id. */
export interface HumanWriteBlock {
  id: string;
  type: HumanWriteNodeType;
  attrs?: Record<string, unknown>;
  content?: unknown;
}

/** Reserved node shapes for later stages — declared now so storage/AI never
 *  has to be reshaped when these arrive. Not yet rendered in Stage 1. */
export interface EquationNode {
  id: string;
  type: "equation";
  latex: string;
  mathml?: string;
  displayMode: "inline" | "block";
  label?: string;
  equationNumber?: number;
  altText?: string;
}

export interface DiagramNode {
  id: string;
  type: "diagram";
  engine: "MERMAID" | "EXCALIDRAW" | "NATIVE";
  sourceData: unknown; // editable source — the diagram is never merely an image
  previewSvg?: string;
  caption?: string;
  altText?: string;
}

export interface TableNodeData {
  id: string;
  type: "table";
  rows: Array<Array<{ content: unknown }>>;
  headerRow?: boolean;
}

/**
 * Publication theme (§21). Deliberately separate from content. A theme restyles
 * a document without touching its semantic structure — the mechanism that will
 * later turn an imported Word file into a designed publication.
 */
export interface PublicationTheme {
  id: string;
  name: string;
  typography?: Record<string, unknown>;
  colours?: Record<string, unknown>;
  page?: Record<string, unknown>;
  headings?: Record<string, unknown>;
  tables?: Record<string, unknown>;
  figures?: Record<string, unknown>;
}

/** Repetition candidate (§9): local layer produces candidates; a later semantic
 *  layer classifies them. Declared now so the two layers share one contract. */
export interface RepetitionCandidate {
  id: string;
  blockIds: string[];
  type: "LEXICAL" | "PHRASE" | "OPENING" | "STRUCTURAL" | "CONCEPTUAL";
  excerpts: string[];
  localConfidence: number;
}

/** Proposed edit (§12): the SAME shape AI edits and, later, reviewer
 *  suggestions use — so we never build a throwaway rewrite mechanism now and a
 *  different tracked-change system later. */
export interface ProposedEdit {
  id: string;
  documentId: string;
  blockId: string;
  operation: "REPLACE" | "DELETE" | "MERGE" | "RESTRUCTURE";
  originalText: string;
  proposedText?: string;
  reason: string;
  diagnosticType?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
}

/** Generate a stable block id. */
export function newBlockId(): string {
  return "b_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
