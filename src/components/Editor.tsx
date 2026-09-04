"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback } from "react";
import { analyseDocument, DocumentDiagnostic, detectParallelRepetition } from "@/lib/diagnostics/engine";
import { api, HumanWriteAPIError } from "@/lib/apiClient";
import SpecPanel, { SpecState, emptySpec } from "./SpecPanel";
import { BlockId } from "@/lib/editor/blockId";

type Mode = "write" | "edit" | "review" | "preview";

export default function Editor() {
  const [mode, setMode] = useState<Mode>("write");
  const [diag, setDiag] = useState<DocumentDiagnostic | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ original: string; revised: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [spec, setSpec] = useState<SpecState>(emptySpec());
  const [showSpec, setShowSpec] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Write, paste or upload something worth refining." }), BlockId],
    content: "",
    immediatelyRender: false,
    editable: true,
  });

  const runReview = useCallback(() => {
    if (!editor) return;
    setDiag(analyseDocument(editor.getText()));
  }, [editor]);

  function switchMode(m: Mode) {
    setMode(m);
    if (editor) editor.setEditable(m === "write" || m === "edit");
    if (m === "review") runReview();
  }

  async function improve() {
    if (!editor) return;
    runReview();
    const text = editor.getText();
    if (!text.trim()) { setBanner("Write something first."); return; }
    setBusy(true); setBanner(null);
    try {
      const { proposal } = await api.rewrite({
        text,
        tasks: ["fixOpenings", "removeRepetition", "removeEmpty", "preserveVoice"],
        mode: "Academic",
        intensity: "Standard Edit",
        documentType: spec.writingType,
        scope: "document",
      });
      setProposal({ original: text, revised: proposal });
      setMode("review");
    } catch (e: unknown) {
      setBanner(e instanceof HumanWriteAPIError ? e.message : "The edit could not complete. Your text is unchanged.");
    } finally { setBusy(false); }
  }

  function acceptProposal() {
    if (!editor || !proposal) return;
    editor.commands.setContent(proposal.revised.split(/\n{2,}/).map((p) => `<p>${p.replace(/</g, "&lt;")}</p>`).join(""));
    setProposal(null);
    runReview();
  }

  const genreLabel = spec.writingType.replace(/-/g, " ");

  return (
    <div style={{ display: "grid", gridTemplateColumns: mode === "preview" ? "1fr" : "minmax(0,1fr) 360px", gap: 24, padding: 24 }}>
      {banner && (
        <div className="banner err">{banner}
          <button onClick={() => setBanner(null)} style={{ position: "absolute", right: 14, top: 10, background: "none", border: "none", color: "#7a3a30", fontSize: 15, cursor: "pointer" }}>x</button>
        </div>
      )}

      <main>
        <div className="sans" style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
          {(["write", "edit", "review", "preview"] as Mode[]).map((m) => (
            <button key={m} onClick={() => switchMode(m)}
              style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: mode === m ? "var(--accent)" : "transparent", color: mode === m ? "#fff" : "var(--muted)", fontWeight: mode === m ? 600 : 400, cursor: "pointer", textTransform: "capitalize" }}>{m}</button>
          ))}
          <span style={{ width: 1, background: "var(--line)", alignSelf: "stretch", margin: "2px 4px" }} />
          <button className="btn" onClick={() => setShowSpec(true)}>Spec my work</button>
          <button className="btn primary" onClick={improve} disabled={busy}>{busy ? "Revising..." : "Improve"}</button>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>Type: <b style={{ color: "var(--accent)", textTransform: "capitalize" }}>{genreLabel}</b></span>
        </div>

        {mode === "preview" ? (
          <div style={{ background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: 10, padding: "48px 56px", maxWidth: 760, margin: "0 auto", minHeight: "60vh" }}
            dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }} />
        ) : (
          <EditorContent editor={editor} />
        )}
      </main>

      {mode !== "preview" && (
        <aside className="sans">
          {proposal ? (
            <div>
              <h3 style={{ fontSize: 14 }}>Proposed revision</h3>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Nothing has changed in your document yet.</p>
              <div style={{ background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5, maxHeight: "50vh", overflow: "auto" }}>{proposal.revised}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn primary" onClick={acceptProposal}>Accept</button>
                <button className="btn" onClick={() => setProposal(null)}>Reject</button>
                <button className="btn" onClick={improve} disabled={busy}>Try again</button>
              </div>
            </div>
          ) : diag ? (
            <div>
              <h3 style={{ fontSize: 14 }}>Review</h3>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>{diag.counts.words} words {"\u00b7"} {diag.counts.sentences} sentences {"\u00b7"} {diag.counts.paragraphs} paragraphs</div>
              {diag.paragraphs.map((p) => {
                const parallels = p.sentences.flatMap((s) => detectParallelRepetition(s));
                return (
                  <div key={p.index} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                      <span>Paragraph {p.index + 1}</span>
                      <span style={{ color: p.health === "Strong" ? "var(--sage)" : p.health === "Needs Editing" ? "var(--gold)" : "var(--terra)" }}>{p.health}</span>
                    </div>
                    {p.openings.diversity !== "High" && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Repeated openings{p.openings.dominantArchetype ? ` -- ${p.openings.dominantArchetype[1]} sentences share one grammatical shape` : ""}.</div>}
                    {p.repeatedWords.length > 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Repeated: {p.repeatedWords.slice(0, 3).map((w) => `${w.word} x${w.count}`).join(", ")}.</div>}
                    {p.formulaic.length > 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Formulaic: {p.formulaic.map((f) => `"${f.phrase}"`).join(", ")}.</div>}
                    {p.emptyStory > 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{p.emptyStory} passage(s) of atmosphere without a concrete event.</div>}
                    {parallels.length > 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Parallel repetition: {parallels[0].note}</div>}
                    {p.health === "Strong" && p.openings.diversity === "High" && parallels.length === 0 && <div style={{ fontSize: 12.5, color: "var(--sage)", marginTop: 4 }}>Specific and clear. No edit recommended.</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Press Review to examine your manuscript. Works offline.</div>
          )}
        </aside>
      )}

      {showSpec && <SpecPanel spec={spec} onChange={setSpec} onClose={() => setShowSpec(false)} />}
    </div>
  );
}
