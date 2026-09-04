/**
 * Local deterministic diagnostics (§5 Layer 1). Fast, inexpensive, and runs with
 * no network — this is what keeps HumanWrite useful when AI is unavailable (§27).
 * Ported from the validated prototype engine (all detectors unit-tested against
 * the original specification examples).
 */

const ABBREV = new Set([
  "mr","mrs","ms","dr","prof","sr","jr","st","vs","etc","eg","ie","cf","al","fig","no","vol","pp","e.g","i.e","u.s","u.k",
]);

export function splitParagraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export function splitSentences(paragraph: string): string[] {
  const chunks: string[] = [];
  const re = /[^.!?]+[.!?]+(?:["')\]]+)?|\S[^.!?]*$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(paragraph)) !== null) chunks.push(m[0]);
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < chunks.length; i++) {
    buf += (buf ? " " : "") + chunks[i].trim();
    const lastWord = buf.replace(/[."')\]]+$/, "").split(/\s+/).pop()!.toLowerCase().replace(/[^a-z.]/g, "");
    const endsAbbrev = ABBREV.has(lastWord);
    const endsDecimal = /\d\.$/.test(buf);
    const tooShort = buf.replace(/[^a-z]/gi, "").length < 2;
    if (!endsAbbrev && !endsDecimal && !tooShort) { out.push(buf.trim()); buf = ""; }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

export const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z][a-z'-]*/g) || [];

const STOP = new Set(
  ("a an the and or but if then else of to in on at by for with as is are was were be been being this that these those it its it's their there here they them he she we you i my our your his her not no nor so than too very can could would should may might must will shall do does did have has had from into over under about above below between within without through during before after while which who whom whose what when where why how all any some each few more most other such only own same also just even still yet however therefore thus hence moreover furthermore additionally consequently").split(/\s+/)
);

const SYNONYMS: Record<string, string> = {
  struggled:"difficulty",struggle:"difficulty",reluctant:"difficulty",hesitant:"difficulty",reluctance:"difficulty",unwilling:"difficulty",
  accept:"trust",trusted:"trust",believe:"trust",verification:"check",verify:"check",checking:"check",checked:"check",confirm:"check",validate:"check",
  outputs:"airesponse",output:"airesponse",responses:"airesponse",response:"airesponse",answers:"airesponse",results:"airesponse",
  users:"person",participants:"person",respondents:"person",people:"person",
  important:"matter",essential:"matter",crucial:"matter",vital:"matter",
  demonstrate:"show",reveal:"show",indicate:"show",suggest:"show",highlight:"show",
};
const normStem = (w: string) => SYNONYMS[w] || w.replace(/(ing|ed|es|s|ly|tion|ness|ment)$/, "");

function contentBag(s: string): Map<string, number> {
  const bag = new Map<string, number>();
  tokenize(s).forEach((w) => { if (STOP.has(w) || w.length < 4) return; const k = normStem(w); bag.set(k, (bag.get(k) || 0) + 1); });
  return bag;
}
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, na = 0, nb = 0;
  a.forEach((v, k) => { na += v * v; if (b.has(k)) dot += v * b.get(k)!; });
  b.forEach((v) => { nb += v * v; });
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

const REPORTING = new Set(["found","find","finds","demonstrate","demonstrates","demonstrated","suggest","suggests","suggested","show","shows","showed","reveal","reveals","revealed","indicate","indicates","indicated","argue","argues","argued","note","notes","noted","report","reports","reported","confirm","confirms","confirmed","highlight","highlights","highlighted","reflect","reflects","imply","implies","means"]);
const DETERMINER = new Set(["the","this","these","those","that","a","an","our","their","its","such"]);

export function openingArchetype(sentence: string): string {
  const toks = tokenize(sentence);
  if (!toks.length) return "other";
  const w0 = toks[0];
  if (DETERMINER.has(w0)) {
    for (let i = 1; i < Math.min(toks.length, 5); i++) { if (REPORTING.has(toks[i])) return "np+report"; if (STOP.has(toks[i]) && i > 1) break; }
    return "np-subject";
  }
  if (["when","while","because","although","if","as","after","before","since","though"].includes(w0)) return "subordinate-open";
  if (["however","moreover","furthermore","therefore","thus","consequently","additionally","ultimately"].includes(w0)) return "transition-open";
  if (REPORTING.has(w0)) return "verb-open";
  return "other";
}

const FORMULAIC = ["at its core","in today's rapidly evolving","in an era defined by","as we navigate","in the ever-changing landscape","it is important to note that","it is worth noting that","interestingly,","crucially,","importantly,","ultimately,","taken together","what becomes clear is","this underscores","this highlights","this reflects","this demonstrates","this speaks to","this serves as a reminder","this raises important questions","the implications are far-reaching","only time will tell","moving forward","this is more than","it is not merely","the question is not whether","in a world where","now more than ever","the reality is that"];

const ABSTRACT = new Set(("world technology future humanity possibility change transformation journey landscape era age innovation potential opportunity challenge reality truth meaning purpose vision impact power society people everyone something anything nothing thing things way ways development implications questions conversation moment significance importance changes").split(/\s+/));
const DRAMA = ["we live in a world","every morning","millions of people","behind every","increasingly clear","not merely","deeply human","faster than ever","at the heart of","in a world where","increasingly shaped"];

function concreteness(raw: string) {
  const toks = tokenize(raw);
  const content = toks.filter((w) => !STOP.has(w));
  const numbers = (raw.match(/\b\d[\d.,%]*\b/g) || []).length;
  const deInit = raw.replace(/(^|[.!?]\s+)([A-Z])/g, "$1 ");
  const propers = (deInit.match(/\b[A-Z][a-z]{2,}\b/g) || []).length;
  const abstractCount = content.filter((w) => ABSTRACT.has(w)).length;
  const abstractRatio = content.length ? abstractCount / content.length : 0;
  const dramaHits = DRAMA.reduce((n, d) => n + (raw.toLowerCase().includes(d) ? 1 : 0), 0);
  return { concrete: numbers * 2 + propers, abstractRatio, dramaHits, contentLen: content.length };
}

export interface ParagraphDiagnostic {
  index: number;
  text: string;
  sentences: string[];
  openings: { diversity: "High" | "Moderate" | "Low"; repeatedWord: [string, number][]; maxConsecutive: number; thisCount: number; dominantArchetype: [string, number] | null };
  repeatedWords: { word: string; count: number }[];
  formulaic: { phrase: string; count: number }[];
  emptyStory: number;
  lowInfo: number;
  health: "Strong" | "Needs Editing" | "Highly Formulaic";
}

export interface DocumentDiagnostic {
  paragraphs: ParagraphDiagnostic[];
  conceptual: { a: { text: string; ref: number }; b: { text: string; ref: number }; sim: number }[];
  indicators: Record<string, "Low" | "Moderate" | "High">;
  counts: { paragraphs: number; sentences: number; words: number };
}

function analyseParagraph(text: string, index: number): ParagraphDiagnostic {
  const sentences = splitSentences(text);
  const lower = text.toLowerCase();
  // openings
  const sigs = sentences.map((s) => tokenize(s)[0] || "");
  const fw: Record<string, number> = {};
  sigs.forEach((w) => { if (w) fw[w] = (fw[w] || 0) + 1; });
  const repeatedWord = Object.entries(fw).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]) as [string, number][];
  let run = 1, maxC = 1;
  for (let i = 1; i < sigs.length; i++) { if (sigs[i] && sigs[i] === sigs[i - 1]) { run++; maxC = Math.max(maxC, run); } else run = 1; }
  const thisCount = sigs.filter((w) => w === "this").length;
  const n = sentences.length || 1;
  const topShare = repeatedWord.length ? repeatedWord[0][1] / n : 0;
  let diversity: "High" | "Moderate" | "Low" = "High";
  if (topShare >= 0.5 || maxC >= 3) diversity = "Low"; else if (topShare >= 0.34 || maxC >= 2) diversity = "Moderate";
  const archCounts: Record<string, number> = {};
  sentences.map(openingArchetype).forEach((a) => { if (a !== "other") archCounts[a] = (archCounts[a] || 0) + 1; });
  const dominantArchetype = (Object.entries(archCounts).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1])[0] || null) as [string, number] | null;

  // repeated words
  const counts = new Map<string, number>(); let total = 0;
  sentences.forEach((s) => tokenize(s).forEach((w) => { if (STOP.has(w) || w.length < 3) return; total++; counts.set(w, (counts.get(w) || 0) + 1); }));
  const words = total || 1;
  const repeatedWords = [...counts.entries()].filter(([, c]) => c >= 3 && c / words > 0.012).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));

  const formulaic = FORMULAIC.map((p) => ({ phrase: p, count: (lower.match(new RegExp("\\b" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"), "g")) || []).length })).filter((x) => x.count > 0);

  let emptyStory = 0, lowInfo = 0;
  sentences.forEach((s) => {
    const c = concreteness(s);
    if ((c.dramaHits >= 1 || c.abstractRatio > 0.5) && c.concrete === 0 && c.contentLen >= 4) emptyStory++;
    if (c.concrete === 0 && c.contentLen > 0 && c.contentLen <= 6 && c.abstractRatio > 0.4) lowInfo++;
  });

  let flags = 0;
  if (diversity === "Low") flags += 2; else if (diversity === "Moderate") flags += 1;
  if (formulaic.reduce((a, b) => a + b.count, 0) >= 2) flags += 1;
  flags += emptyStory; if (lowInfo) flags += 1; if (repeatedWords.length) flags += 1;
  let health: "Strong" | "Needs Editing" | "Highly Formulaic" = "Strong";
  if (flags >= 4) health = "Highly Formulaic"; else if (flags >= 2) health = "Needs Editing";

  return { index, text, sentences, openings: { diversity, repeatedWord, maxConsecutive: maxC, thisCount, dominantArchetype }, repeatedWords, formulaic, emptyStory, lowInfo, health };
}

const level = (x: number): "Low" | "Moderate" | "High" => (x >= 3 ? "High" : x >= 1 ? "Moderate" : "Low");

export function analyseDocument(text: string): DocumentDiagnostic {
  const paras = splitParagraphs(text);
  const paragraphs = paras.map((p, i) => analyseParagraph(p, i));
  const allS: { text: string; ref: number }[] = [];
  paragraphs.forEach((p) => p.sentences.forEach((s) => allS.push({ text: s, ref: p.index })));
  const bags = allS.map((u) => contentBag(u.text));
  const conceptual: DocumentDiagnostic["conceptual"] = [];
  for (let i = 0; i < allS.length; i++)
    for (let j = i + 1; j < allS.length; j++) {
      if (bags[i].size < 3 || bags[j].size < 3) continue;
      const sim = cosine(bags[i], bags[j]);
      if (sim >= 0.35) conceptual.push({ a: allS[i], b: allS[j], sim });
    }
  conceptual.sort((x, y) => y.sim - x.sim);
  const words = tokenize(paras.join(" ")).length;
  const indicators = {
    formulaicRisk: level(paragraphs.reduce((a, b) => a + b.formulaic.reduce((x, y) => x + y.count, 0), 0) / Math.max(1, words / 200)),
    openingRepetition: level((paragraphs.filter((p) => p.openings.diversity !== "High").length / Math.max(1, paragraphs.length)) * 3),
    emptyStorytelling: level(paragraphs.reduce((a, b) => a + b.emptyStory, 0)),
    lowInformation: level(paragraphs.reduce((a, b) => a + b.lowInfo, 0)),
    conceptualRepetition: level(conceptual.length),
  };
  return { paragraphs, conceptual: conceptual.slice(0, 8), indicators, counts: { paragraphs: paras.length, sentences: allS.length, words } };
}
