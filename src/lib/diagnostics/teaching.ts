import { DocumentDiagnostic } from "./engine";

/**
 * Teaching layer ("Learn" / Read Like a Writer). Turns what the engine detects
 * into pedagogical lessons: name the PROBLEM, state the PRINCIPLE behind it,
 * and prompt the writer to TRY it themselves — rather than silently rewriting.
 *
 * The rewrite option stays available: each lesson can be resolved by the writer
 * rewriting it, OR by asking HumanWrite to rewrite it. Teaching is the default,
 * not a cage.
 *
 * Principles are stated as general craft knowledge (not copied from any
 * copyrighted source): Strunk & White, Gopen & Swan, Williams, Zinsser, and the
 * standard rhetorical moves taught in university writing centres.
 */

export type WritingDimension =
  | "Ideas"
  | "Argument"
  | "Structure"
  | "Paragraphs"
  | "Sentences"
  | "Vocabulary"
  | "Voice"
  | "Editing";

export interface Lesson {
  id: string;
  dimension: WritingDimension;
  problem: string;      // what is wrong, named plainly
  principle: string;    // the craft principle behind it
  tryThis: string;      // a question or prompt that invites the writer to revise
  evidence: string[];   // where in the writer's own text this shows
  rewriteTasks: string[]; // if the writer chooses "rewrite for me" instead
}

const GENERIC_OPENERS = ["is very important", "in today's society", "in today's world", "there are many advantages and disadvantages", "plays a vital role", "has become increasingly", "since the beginning of time"];

export function buildLessons(a: DocumentDiagnostic, fullText: string): Lesson[] {
  const lessons: Lesson[] = [];
  const lower = fullText.toLowerCase();
  const push = (l: Omit<Lesson, "id">) => { if (l.evidence.length) lessons.push({ id: "lesson-" + lessons.length, ...l }); };

  // IDEAS — generic opening that announces a topic without a problem
  const genericHits = GENERIC_OPENERS.filter((g) => lower.includes(g));
  push({
    dimension: "Ideas",
    problem: "The opening announces a topic but gives the reader no intellectual problem to examine.",
    principle: "Strong writing establishes something worth examining — a tension, a question, a contested claim — rather than merely naming the subject.",
    tryThis: "What exactly about this subject is contested or surprising? Who benefits, who loses, what tension exists? Open there.",
    evidence: genericHits.map((g) => `Generic phrasing: "${g}"`),
    rewriteTasks: ["makeDirect", "removeFormulaic"],
  });

  // SENTENCES — repeated openings (cohesion / variation)
  const openEv: string[] = [];
  a.paragraphs.forEach((p) => {
    if (p.openings.diversity !== "High") {
      const rw = p.openings.repeatedWord.filter(([, c]) => c >= 2)[0];
      if (rw) openEv.push(`Para ${p.index + 1}: "${rw[0]}" begins ${rw[1]} sentences`);
    }
  });
  push({
    dimension: "Sentences",
    problem: "Several sentences begin the same way, which flattens the rhythm and hides how ideas relate.",
    principle: "Vary the topic position of sentences; when successive sentences share a subject and verb, the prose reads mechanically and connections blur (Gopen & Swan).",
    tryThis: "Rewrite two of these sentences so they open differently — try starting one with a subordinate clause, another with the object of the idea.",
    evidence: openEv,
    rewriteTasks: ["fixOpenings"],
  });

  // EDITING — wordiness / needless words
  const wordyEv: string[] = [];
  [["in order to", "to"], ["due to the fact that", "because"], ["it is important to note that", "(often cut entirely)"]].forEach(([f, t]) => {
    if (lower.includes(f)) wordyEv.push(`"${f}" -> ${t}`);
  });
  push({
    dimension: "Editing",
    problem: "Phrases here take several words to do the work of one.",
    principle: "Omit needless words — vigorous writing is concise; every word should tell (Strunk & White).",
    tryThis: "Cut each of these to its shortest honest form. Read the sentence aloud after — does anything meaningful disappear? If not, keep it cut.",
    evidence: wordyEv,
    rewriteTasks: ["tighten"],
  });

  // PARAGRAPHS — empty / low-information sentences
  const emptyEv: string[] = [];
  a.paragraphs.forEach((p) => { if (p.emptyStory || p.lowInfo) emptyEv.push(`Para ${p.index + 1}: a sentence gestures at significance without specifics`); });
  push({
    dimension: "Paragraphs",
    problem: "A sentence sounds important but adds no concrete information.",
    principle: "Every sentence must earn its place — a sentence that gestures at significance without evidence or a specific claim is doing rhetorical, not intellectual, work.",
    tryThis: "Ask of the sentence: what would the reader lose if it disappeared? If little, cut it. If something real, make that thing explicit.",
    evidence: emptyEv,
    rewriteTasks: ["removeEmpty", "removeStorytelling"],
  });

  return lessons;
}

/** The 8-dimension summary shown to the writer, with a plain status per dimension. */
export function dimensionSummary(lessons: Lesson[]): { dimension: WritingDimension; issues: number }[] {
  const dims: WritingDimension[] = ["Ideas", "Argument", "Structure", "Paragraphs", "Sentences", "Vocabulary", "Voice", "Editing"];
  return dims.map((d) => ({ dimension: d, issues: lessons.filter((l) => l.dimension === d).length }));
}
