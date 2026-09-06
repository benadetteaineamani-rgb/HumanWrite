"use client";

import { useState } from "react";

/**
 * Spec My Work (Doc 1 §1, Doc "What Are You Writing"). A pre-writing intent
 * workspace, distinct from Preview. Captures what the document is for, who it is
 * for, and constraints — then this travels to the AI as editorial context.
 */

const WRITING_TYPES: { category: string; options: { id: string; label: string }[] }[] = [
  { category: "Academic & Research", options: [{ id: "thesis", label: "Thesis / chapter" }, { id: "academic-article", label: "Journal article" }, { id: "literature-review", label: "Literature review" }, { id: "research-report", label: "Research report" }] },
  { category: "Fiction", options: [{ id: "novel", label: "Novel / literary fiction" }, { id: "short-story", label: "Short story" }, { id: "childrens-fiction", label: "Children's fiction" }] },
  { category: "Non-fiction Book", options: [{ id: "nonfiction-book", label: "General non-fiction" }, { id: "popular-science", label: "Popular science" }, { id: "business-book", label: "Business / leadership" }, { id: "memoir", label: "Memoir" }, { id: "biography", label: "Biography / autobiography" }, { id: "self-development", label: "Self-development" }, { id: "narrative-nonfiction", label: "Narrative non-fiction" }, { id: "investigative", label: "Investigative non-fiction" }, { id: "textbook", label: "Textbook / educational" }] },
  { category: "Children's Writing", options: [{ id: "childrens-story", label: "Children's story" }] },
  { category: "Professional & Executive", options: [{ id: "executive-report", label: "Executive report" }, { id: "strategy-paper", label: "Strategy paper" }, { id: "proposal", label: "Proposal / white paper" }] },
  { category: "Public & Thought Leadership", options: [{ id: "linkedin", label: "LinkedIn post" }, { id: "linkedin-article", label: "LinkedIn article" }, { id: "opinion", label: "Opinion / commentary" }, { id: "speech", label: "Speech / keynote" }] },
  { category: "Educational", options: [{ id: "lesson", label: "Lesson / teaching material" }] },
  { category: "Reflective / Personal", options: [{ id: "reflective", label: "Reflective / personal essay" }] },
  { category: "Creative & Other", options: [{ id: "poetry", label: "Poetry" }] },
  { category: "General", options: [{ id: "general", label: "General document" }] },
];

const PURPOSES = ["Inform", "Explain", "Teach", "Argue", "Persuade", "Analyse", "Reflect", "Tell a story", "Recommend action"];

export interface SpecState {
  writingType: string;
  purpose: string[];
  audience: string;
  centralArgument: string;
  tone: string;
  avoid: string;
  requiredTerminology: string;
  additionalInstructions: string;
}

export function emptySpec(): SpecState {
  return { writingType: "general", purpose: [], audience: "", centralArgument: "", tone: "", avoid: "", requiredTerminology: "", additionalInstructions: "" };
}

export default function SpecPanel({
  spec, onChange, onClose,
}: { spec: SpecState; onChange: (s: SpecState) => void; onClose: () => void }) {
  const [local, setLocal] = useState<SpecState>(spec);
  const set = (patch: Partial<SpecState>) => setLocal((s) => ({ ...s, ...patch }));
  const togglePurpose = (p: string) => set({ purpose: local.purpose.includes(p) ? local.purpose.filter((x) => x !== p) : [...local.purpose, p] });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(37,34,41,.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div className="sans" style={{ background: "#fff", borderRadius: 14, padding: 24, width: "min(640px,94vw)", maxHeight: "88vh", overflow: "auto" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Spec my work</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 18 }}>Define what this document is for. HumanWrite uses this when it reviews and edits — so it judges the writing against what you actually intend.</div>

        <label style={{ fontSize: 12, fontWeight: 600 }}>What are you writing?</label>
        <select value={local.writingType} onChange={(e) => set({ writingType: e.target.value })} style={{ width: "100%", padding: 8, marginTop: 6, marginBottom: 16, borderRadius: 7, border: "1px solid var(--line)", fontFamily: "inherit" }}>
          {WRITING_TYPES.map((g) => (
            <optgroup key={g.category} label={g.category}>
              {g.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>

        <label style={{ fontSize: 12, fontWeight: 600 }}>What should it accomplish?</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 16px" }}>
          {PURPOSES.map((p) => (
            <button key={p} onClick={() => togglePurpose(p)} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, border: "1px solid var(--line)", background: local.purpose.includes(p) ? "var(--accent)" : "#fff", color: local.purpose.includes(p) ? "#fff" : "var(--ink)", cursor: "pointer" }}>{p}</button>
          ))}
        </div>

        {[
          { key: "audience" as const, label: "Who are you writing for?", placeholder: "e.g. academic examiners; general public; 7–9 year olds" },
          { key: "centralArgument" as const, label: "Central argument or message", placeholder: "The single point this piece exists to make" },
          { key: "tone" as const, label: "Tone", placeholder: "e.g. restrained and precise; warm; authoritative" },
          { key: "requiredTerminology" as const, label: "Required / protected terminology (comma-separated)", placeholder: "terms to keep exactly, not vary for style" },
          { key: "avoid" as const, label: "Things to avoid (comma-separated)", placeholder: "e.g. inflated claims, unnecessary summary, clichés" },
          { key: "additionalInstructions" as const, label: "Additional instructions", placeholder: "Anything else HumanWrite should respect" },
        ].map((f) => (
          <div key={f.key} style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</label>
            <input value={local[f.key]} onChange={(e) => set({ [f.key]: e.target.value } as Partial<SpecState>)} placeholder={f.placeholder}
              style={{ width: "100%", padding: 8, marginTop: 6, borderRadius: 7, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 13 }} />
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => { onChange(local); onClose(); }}>Save specification</button>
        </div>
      </div>
    </div>
  );
}
