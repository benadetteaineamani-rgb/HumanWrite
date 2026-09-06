import { DocumentDiagnostic, detectParallelRepetition, splitSentences } from "./engine";

/**
 * Grounded Fix suggestions (batch 1). Each fix is diagnosed locally, cites an
 * established editorial principle, and points at the specific evidence in the
 * writer's own text — so "Fix" is a considered editorial suggestion, not a blind
 * rewrite button. Sources: Strunk & White (Elements of Style), Gopen & Swan
 * (The Science of Scientific Writing), Williams (Style), Zinsser (On Writing Well).
 */

export interface FixSuggestion {
  id: string;
  title: string;
  principle: string;
  source: string;
  evidence: string[];
  found: boolean;
  tasks: string[]; // maps to rewrite tasks
}

const WORDY: [string, string][] = [
  ["in order to", "to"], ["due to the fact that", "because"], ["has the ability to", "can"],
  ["at this point in time", "now"], ["in the event that", "if"], ["a large number of", "many"],
  ["with regard to", "about"], ["in the context of", "in"], ["for the purpose of", "to"],
];
const FILLER = ["it is important to note that", "it is worth noting that", "needless to say", "at the end of the day", "in a world where"];

export function buildFixSuggestions(a: DocumentDiagnostic, fullText: string): { recommended: FixSuggestion[]; advanced: FixSuggestion[] } {
  const lower = fullText.toLowerCase();

  const build = (id: string, title: string, principle: string, source: string, evidence: string[], tasks: string[]): FixSuggestion =>
    ({ id, title, principle, source, evidence, found: evidence.length > 0, tasks });

  // Repetition evidence
  const repEv: string[] = [];
  a.paragraphs.forEach((p) => { if (p.repeatedWords.length) repEv.push(`Para ${p.index + 1}: "${p.repeatedWords[0].word}" ×${p.repeatedWords[0].count}`); });
  a.conceptual.slice(0, 2).forEach((c) => repEv.push(`Paras ${c.a.ref + 1} & ${c.b.ref + 1} may make the same point (≈${Math.round(c.sim * 100)}%)`));

  // Openings evidence
  const openEv: string[] = [];
  a.paragraphs.forEach((p) => {
    if (p.openings.diversity !== "High") {
      const rw = p.openings.repeatedWord.filter(([, c]) => c >= 2)[0];
      openEv.push(`Para ${p.index + 1}: ${rw ? `"${rw[0]}" begins ${rw[1]} sentences` : "repeated openings"}${p.openings.dominantArchetype ? `; ${p.openings.dominantArchetype[1]} share the same grammatical shape` : ""}`);
    }
  });

  // Empty-writing evidence
  const emptyEv: string[] = [];
  a.paragraphs.forEach((p) => { if (p.emptyStory) emptyEv.push(`Para ${p.index + 1}: atmosphere without a concrete event`); if (p.lowInfo) emptyEv.push(`Para ${p.index + 1}: a sentence gestures without specifics`); });

  // Tighten evidence
  const tightenEv: string[] = [];
  WORDY.forEach(([f, t]) => { if (new RegExp("\\b" + f.replace(/ /g, "\\s+") + "\\b", "i").test(lower)) tightenEv.push(`"${f}" → "${t}"`); });
  FILLER.forEach((f) => { if (lower.includes(f)) tightenEv.push(`filler: "${f}"`); });

  // Formulaic evidence
  const formEv: string[] = [];
  a.paragraphs.forEach((p) => p.formulaic.forEach((f) => { if (!formEv.includes(`"${f.phrase}"`)) formEv.push(`"${f.phrase}"`); }));

  // Parallel-repetition evidence
  const parEv: string[] = [];
  splitSentences(fullText).forEach((s) => detectParallelRepetition(s).forEach((f) => parEv.push(f.note)));

  // Clarity evidence (ambiguous "this" openings)
  const clarEv: string[] = [];
  a.paragraphs.forEach((p) => { if (p.openings.thisCount >= 2) clarEv.push(`Para ${p.index + 1}: "This" opens ${p.openings.thisCount} sentences without a named referent`); });

  const recommended = [
    build("removeRepetition", "Remove repetition", "A paragraph should contain no unnecessary sentences; repeated ideas dilute emphasis.", "Strunk & White, Rule 17", repEv, ["removeRepetition"]),
    build("fixOpenings", "Fix sentence openings", "Vary the topic position; successive sentences sharing a subject and verb read mechanically.", "Gopen & Swan (1990)", openEv, ["fixOpenings"]),
    build("removeEmpty", "Remove empty writing", "Every unit of discourse should serve a single point; a sentence that gestures without specifics earns no place.", "Gopen & Swan; Zinsser", emptyEv, ["removeEmpty", "removeStorytelling"]),
    build("clarify", "Make clearer", "Name the referent of an ambiguous 'this', 'it' or 'they'; keep the subject close to its verb.", "Williams, Style", clarEv, ["clarify"]),
    build("tighten", "Tighten", "Omit needless words. Vigorous writing is concise — every word should tell.", "Strunk & White, Rule 17", tightenEv, ["tighten"]),
  ];

  const advanced = [
    build("removeFormulaic", "Remove formulaic writing", "Worn transitional and inspirational phrases take up space without telling the reader anything.", "Zinsser, On Writing Well", formEv, ["removeFormulaic"]),
    build("reviewParallel", "Review parallel repetition", "Repeated parallel structure may be deliberate emphasis (anaphora) or mechanical padding — a judgement, not an automatic fault.", "Editorial convention", parEv, ["removeRepetition"]),
    build("deepEdit", "Deep edit", "A thorough structural rewrite that preserves meaning, evidence and voice.", "Editorial practice", [], ["deepEdit"]),
  ];

  return { recommended, advanced };
}

import type { DiagPhrase } from "@/lib/editor/diagnosticMarks";

/**
 * Turn a document diagnostic into the specific phrases to underline inline.
 * Only concrete, findable substrings are returned so the underline lands on the
 * actual problem text.
 */
export function diagnosticPhrases(a: DocumentDiagnostic): DiagPhrase[] {
  const phrases: DiagPhrase[] = [];
  const seen = new Set<string>();
  const add = (text: string, kind: DiagPhrase["kind"], note: string) => {
    const key = kind + "|" + text.toLowerCase();
    if (!text || text.length < 3 || seen.has(key)) return;
    seen.add(key);
    phrases.push({ text, kind, note });
  };
  a.paragraphs.forEach((p) => {
    // repeated opening words -> underline the leading word where it repeats
    if (p.openings.diversity !== "High") {
      p.openings.repeatedWord.filter(([, c]) => c >= 2).forEach(([w, c]) => {
        add(w, "opening", `"${w}" begins ${c} sentences in this paragraph — vary the openings.`);
      });
    }
    // formulaic phrases
    p.formulaic.forEach((f) => add(f.phrase, "formulaic", `Formulaic phrase — often adds little. Consider cutting.`));
    // repeated content words
    p.repeatedWords.slice(0, 2).forEach((w) => add(w.word, "repetition", `"${w.word}" repeats ${w.count}× — check whether each is needed.`));
  });
  return phrases;
}
