import { DocumentDiagnostic } from "./engine";
import { getGenreProfile } from "../intelligence/genres";

/**
 * Writing Intelligence — grounded, genre-aware craft guidance (checks + lessons).
 *
 * Every principle here is stated in our own words and attributed to the
 * tradition it comes from (Harvard College Writing Center craft guides; standard
 * discipline conventions; established nonfiction craft). No copyrighted text is
 * reproduced. Which principles apply, and how strongly, depends on the WRITING
 * TYPE — repetition is a fault in an executive brief but a strength in a
 * children's story, so the same detection is weighted differently per genre.
 *
 * A principle can surface two ways ("both"): as a CHECK (flagged against the
 * draft) and as a LESSON (taught in Learn mode), each carrying an IMPROVEMENT
 * suggestion grounded in the best-established guidance for that writing type.
 */

export interface CraftPrinciple {
  id: string;
  title: string;
  // which writing-type ids this applies to; ["*"] = all
  appliesTo: string[];
  source: string; // attribution, in our words
  principle: string;
  // how the writer's draft is checked for a weakness (deterministic signal name)
  checkSignal:
    | "descriptive-thesis"
    | "funnel-opening"
    | "missing-topic-sentence"
    | "weak-transition"
    | "no-counterargument"
    | "buried-recommendation"
    | "summary-not-synthesis"
    | "unearned-reflection"
    | "none";
  weakLabel: string; // shown when the check fires
  improvement: string; // the best-way improvement guidance
  lesson: string; // the "try this" taught in Learn mode
}

export const CRAFT_PRINCIPLES: CraftPrinciple[] = [
  {
    id: "arguable-thesis",
    title: "An arguable thesis, not a descriptive one",
    appliesTo: ["thesis", "academic-article", "research-report", "literature-review", "philosophy", "history", "psychology", "english", "opinion", "nonfiction-book"],
    source: "Harvard College Writing Center — Thesis",
    principle: "A strong thesis makes an arguable claim a thoughtful reader could dispute — not a description or summary the reader could already see for themselves.",
    checkSignal: "descriptive-thesis",
    weakLabel: "This opening reads as descriptive or summarising rather than making an arguable claim.",
    improvement: "State a claim someone could reasonably disagree with, then let the essay defend it. Ask: what is at stake, and why would a reader need my argument to see it?",
    lesson: "Is your central claim something a thoughtful reader could argue against? If everyone would simply agree, it is descriptive — sharpen it into a claim that needs defending.",
  },
  {
    id: "framed-introduction",
    title: "Frame the question; avoid the funnel opening",
    appliesTo: ["thesis", "academic-article", "research-report", "literature-review", "philosophy", "history", "psychology", "english", "nonfiction-book", "opinion", "reflective"],
    source: "Harvard College Writing Center — Introductions",
    principle: "A strong introduction frames the specific question or problem and what is at stake, rather than opening with a broad generalisation, a dictionary definition, or a 'since the dawn of time' funnel.",
    checkSignal: "funnel-opening",
    weakLabel: "This opening is very general ('in today's society', 'since the beginning of time') and delays the real point.",
    improvement: "Open on the actual question your piece answers and why it matters. Cut the broad windup; a reader needs the stake, not the horizon.",
    lesson: "Does your first sentence name the specific problem you address, or does it start broad and funnel inward? Replace a general opener with the precise question at issue.",
  },
  {
    id: "topic-sentence",
    title: "Each paragraph earns a topic sentence",
    appliesTo: ["*"],
    source: "Harvard College Writing Center — Anatomy of a Body Paragraph",
    principle: "A body paragraph usually needs a topic sentence that makes a claim and signals how it connects to the larger argument — then evidence, then analysis of that evidence.",
    checkSignal: "missing-topic-sentence",
    weakLabel: "This paragraph opens by describing rather than making a claim the paragraph will support.",
    improvement: "Begin with a sentence that states the paragraph's point, then give evidence, then say what the evidence means. End on what the reader now understands, not a summary.",
    lesson: "Does the paragraph's first sentence make a claim, or just describe? Try opening with the point, then supporting it — claim, evidence, analysis.",
  },
  {
    id: "old-to-new-transition",
    title: "Transitions move from old information to new",
    appliesTo: ["*"],
    source: "Harvard College Writing Center — Transitions",
    principle: "Clear transitions begin with information already familiar to the reader before introducing what is new, so the connection between ideas is immediate. A bare 'however' or 'moreover' is not a substitute for showing the relationship.",
    checkSignal: "weak-transition",
    weakLabel: "Transitions here lean on connective words ('however', 'moreover') without linking back to what came before.",
    improvement: "Start the sentence with the idea the reader already has, then introduce the new one. Choose the connective for the actual relationship — contrast, cause, elaboration — not as filler.",
    lesson: "Between these ideas, what does the reader already know that the next sentence builds on? Lead with that, then add the new point.",
  },
  {
    id: "counterargument",
    title: "Anticipate and address counterarguments",
    appliesTo: ["thesis", "academic-article", "philosophy", "history", "opinion", "research-report", "nonfiction-book", "business-book"],
    source: "Harvard College Writing Center — Counterargument",
    principle: "A persuasive argument anticipates the strongest reasonable objection and addresses it — conceding what is right, then explaining why the argument still holds — rather than ignoring disagreement.",
    checkSignal: "no-counterargument",
    weakLabel: "The argument does not appear to engage any counterargument or alternative view.",
    improvement: "Name the strongest objection a fair reader could raise, then counter it — show a flaw, concede-and-limit, or refine your claim. Engage it where it strengthens your case, not everywhere.",
    lesson: "What is the best objection to your claim? State it fairly, then explain why your argument survives it. An argument that ignores disagreement is weaker, not safer.",
  },
  {
    id: "synthesis-not-summary",
    title: "Synthesise sources; don't summarise them one by one",
    appliesTo: ["literature-review", "academic-article", "research-report", "scholarly", "psychology", "history"],
    source: "Scholarly convention (as in discipline writing guides)",
    principle: "Strong scholarly writing integrates multiple studies around an idea — comparing, reconciling, and positioning them — rather than walking through each source in turn.",
    checkSignal: "summary-not-synthesis",
    weakLabel: "This reads as one-study-at-a-time summary rather than synthesis across sources.",
    improvement: "Organise by idea, not by source. Group what studies share, where they conflict, and what your reading adds — cite in support of a point rather than reporting each in sequence.",
    lesson: "Are you moving source by source, or idea by idea? Reorganise around the claims, bringing several sources to bear on each.",
  },
  {
    id: "decision-first",
    title: "Put the recommendation where it can be found",
    appliesTo: ["executive-report", "strategy-paper", "proposal", "business-book"],
    source: "Executive-writing convention",
    principle: "Decision-oriented writing surfaces the recommendation and its stakes early, then supports it — rather than making the reader excavate the conclusion from the end.",
    checkSignal: "buried-recommendation",
    weakLabel: "The recommendation or decision seems buried rather than surfaced early.",
    improvement: "Lead with the recommendation and why it matters, then give the evidence and risks. A decision-maker should grasp the ask in the first lines.",
    lesson: "If a busy reader saw only your opening, would they know what you are recommending and why? If not, move the decision to the front.",
  },
  {
    id: "earned-reflection",
    title: "Reflection is earned by specific experience",
    appliesTo: ["memoir", "reflective", "narrative-nonfiction", "biography", "novel", "short-story"],
    source: "Narrative craft (as in nonfiction and memoir guidance)",
    principle: "In reflective and narrative writing, insight lands when it grows out of a specific observed moment — scene before interpretation — rather than abstract profundity stated up front.",
    checkSignal: "unearned-reflection",
    weakLabel: "A reflective or philosophical statement arrives before any concrete experience grounds it.",
    improvement: "Ground the reflection in a specific moment the reader can see first. Let the scene carry the feeling; state the meaning only after it has been shown. Never invent detail to fill it.",
    lesson: "Does the insight come before or after the concrete moment? Put the observed experience first and let the reflection grow from it.",
  },
];

/** Return the principles that apply to a given writing type. */
export function principlesForType(writingType: string): CraftPrinciple[] {
  return CRAFT_PRINCIPLES.filter((p) => p.appliesTo.includes("*") || p.appliesTo.includes(writingType));
}

/**
 * Genre-weighted improvement priorities for a document. Combines the local
 * diagnostic signals with the genre's diagnostic weights so the guidance offered
 * matches the writing type — the "improvement based on the best way" for THIS
 * kind of writing.
 */
export interface Improvement {
  principleId: string;
  title: string;
  source: string;
  priority: number; // 0..1, genre-weighted
  weakLabel: string;
  improvement: string;
  lesson: string;
}

export function improvementsFor(a: DocumentDiagnostic, writingType: string): Improvement[] {
  const genre = getGenreProfile(writingType);
  const w = genre.diagnosticWeights;
  const principles = principlesForType(writingType);

  // Map local diagnostic evidence to principle priority, scaled by genre weight.
  const anyOpening = a.paragraphs.some((p) => p.openings.diversity !== "High");
  const anyEmpty = a.paragraphs.some((p) => p.emptyStory || p.lowInfo);
  const anyFormulaic = a.paragraphs.some((p) => p.formulaic.length > 0);
  const anyRepeat = a.paragraphs.some((p) => p.repeatedWords.length > 0);

  const out: Improvement[] = [];
  const add = (p: CraftPrinciple, base: number) => {
    if (base <= 0) return;
    out.push({ principleId: p.id, title: p.title, source: p.source, priority: Math.min(1, base), weakLabel: p.weakLabel, improvement: p.improvement, lesson: p.lesson });
  };

  principles.forEach((p) => {
    switch (p.id) {
      case "framed-introduction":
        add(p, anyFormulaic ? w.formulaic : 0.2);
        break;
      case "topic-sentence":
        add(p, anyOpening ? w.openingDiversity : 0.15);
        break;
      case "old-to-new-transition":
        add(p, anyOpening ? w.openingDiversity * 0.8 : 0.1);
        break;
      case "earned-reflection":
        add(p, anyEmpty ? w.emptyStorytelling : 0.15);
        break;
      case "synthesis-not-summary":
        add(p, anyRepeat ? w.repetition : 0.2);
        break;
      default:
        add(p, 0.25); // available as guidance even without a strong local signal
    }
  });

  return out.sort((x, y) => y.priority - x.priority);
}
