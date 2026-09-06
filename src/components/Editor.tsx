"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useCallback } from "react";
import { analyseDocument, DocumentDiagnostic, detectParallelRepetition } from "@/lib/diagnostics/engine";
import { buildFixSuggestions, FixSuggestion, diagnosticPhrases } from "@/lib/diagnostics/fixes";
import { DiagnosticMarks, diagKey } from "@/lib/editor/diagnosticMarks";
import { api, HumanWriteAPIError } from "@/lib/apiClient";
import SpecPanel, { SpecState, emptySpec } from "./SpecPanel";
import { BlockId } from "@/lib/editor/blockId";
import { exportDocx, htmlToExportBlocks, downloadBlob } from "@/lib/export";

type Mode = "write" | "edit" | "review" | "preview";

export default function Editor() {
  const [mode, setMode] = useState<Mode>("write");
  const [diag, setDiag] = useState<DocumentDiagnostic | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ original: string; revised: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [spec, setSpec] = useState<SpecState>(emptySpec());
  const [showSpec, setShowSpec] = useState(false);
  const [showFix, setShowFix] = useState(false);
  const [purpose, setPurpose] = useState<Record<number, string>>({});

  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false }), Placeholder.configure({ placeholder: "Write, paste or upload something worth refining." }), BlockId, DiagnosticMarks],
    content: "",
    immediatelyRender: false,
    editable: true,
  });

  const runReview = useCallback(() => {
    if (!editor) return;
    const d = analyseDocument(editor.getText());
    setDiag(d);
    // feed inline underlines and refresh decorations
    const ext = editor.extensionManager.extensions.find((e) => e.name === "diagnosticMarks");
    if (ext) { ext.options.phrases = diagnosticPhrases(d); ext.options.enabled = true; editor.view.dispatch(editor.state.tr.setMeta(diagKey, true)); }
  }, [editor]);

  function setMarksEnabled(on: boolean) {
    if (!editor) return;
    const ext = editor.extensionManager.extensions.find((e) => e.name === "diagnosticMarks");
    if (ext) { ext.options.enabled = on; editor.view.dispatch(editor.state.tr.setMeta(diagKey, on)); }
  }

  function switchMode(m: Mode) {
    setMode(m);
    if (editor) editor.setEditable(m === "write" || m === "edit");
    if (m === "review") runReview();
    else setMarksEnabled(false);
  }

  async function runTasks(tasks: string[], scope: "document" | "block") {
    if (!editor) return;
    const text = editor.getText();
    if (!text.trim()) { setBanner("Write something first."); return; }
    setBusy(true); setBanner(null); setShowFix(false);
    try {
      const { proposal } = await api.rewrite({ text, tasks: [...tasks, "preserveVoice"], mode: "Academic", intensity: "Standard Edit", documentType: spec.writingType, scope });
      setProposal({ original: text, revised: proposal });
      setMode("review");
    } catch (e) {
      setBanner(e instanceof HumanWriteAPIError ? e.message : "The edit could not complete. Your text is unchanged.");
    } finally { setBusy(false); }
  }

  function acceptProposal() {
    if (!editor || !proposal) return;
    editor.commands.setContent(proposal.revised.split(/\n{2,}/).map((p) => `<p>${p.replace(/</g, "&lt;")}</p>`).join(""));
    setProposal(null);
    runReview();
  }

  async function askPurpose(idx: number, text: string) {
    setPurpose((m) => ({ ...m, [idx]: "..." }));
    try {
      const { answer } = await api.editorialQuestion({ question: "In at most 12 words, state the single proposition this paragraph exists to make. No preamble.", text });
      setPurpose((m) => ({ ...m, [idx]: answer }));
    } catch {
      setPurpose((m) => ({ ...m, [idx]: "(needs a connection to answer)" }));
    }
  }

  async function exportWord() {
    if (!editor) return;
    try {
      const blocks = htmlToExportBlocks(editor.getHTML());
      const blob = await exportDocx("HumanWrite document", blocks);
      downloadBlob(blob, "humanwrite-document.docx");
    } catch { setBanner("Export failed. Please try again."); }
  }

  const genreLabel = spec.writingType.replace(/-/g, " ");
  const fixes = diag && editor ? buildFixSuggestions(diag, editor.getText()) : null;
  const tb = (label: string, active: boolean, fn: () => void) => (
    <button onMouseDown={(e) => { e.preventDefault(); fn(); }}
      style={{ minWidth: 30, height: 28, borderRadius: 6, border: "1px solid var(--line)", background: active ? "var(--accent)" : "#fff", color: active ? "#fff" : "var(--ink)", cursor: "pointer", fontSize: 13, padding: "0 8px" }}>{label}</button>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: mode === "preview" ? "1fr" : "minmax(0,1fr) 380px", gap: 24, padding: 24 }}>
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
          <button className="btn" onClick={() => { runReview(); setShowFix(true); }}>Fix</button>
          <button className="btn primary" onClick={() => runTasks(["fixOpenings", "removeRepetition", "removeEmpty"], "document")} disabled={busy}>{busy ? "Revising..." : "Improve"}</button>
          <button className="btn" onClick={exportWord}>Export .docx</button>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>Type: <b style={{ color: "var(--accent)", textTransform: "capitalize" }}>{genreLabel}</b></span>
        </div>

        {(mode === "write" || mode === "edit") && editor && (
          <div className="sans" style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap", padding: "8px 10px", background: "var(--panel)", borderRadius: 8 }}>
            {tb("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
            {tb("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
            {tb("U", editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run())}
            {tb("S", editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run())}
            <span style={{ width: 1, background: "var(--line)", margin: "2px 4px" }} />
            {tb("H1", editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            {tb("H2", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            {tb("H3", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
            <span style={{ width: 1, background: "var(--line)", margin: "2px 4px" }} />
            {tb("• List", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
            {tb("1. List", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
            {tb("Quote", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run())}
            <span style={{ width: 1, background: "var(--line)", margin: "2px 4px" }} />
            {tb("↶", false, () => editor.chain().focus().undo().run())}
            {tb("↷", false, () => editor.chain().focus().redo().run())}
          </div>
        )}

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
                <button className="btn" onClick={() => runTasks(["fixOpenings", "removeRepetition", "removeEmpty"], "document")} disabled={busy}>Try again</button>
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
                    <div style={{ marginTop: 8 }}>
                      <button className="btn" style={{ fontSize: 12 }} onClick={() => askPurpose(p.index, p.text)}>What is this saying?</button>
                    </div>
                    {purpose[p.index] && <div style={{ marginTop: 8, padding: 8, background: "var(--accent-soft)", borderRadius: 6, fontSize: 12.5 }}><b style={{ color: "var(--accent)" }}>This paragraph is saying:</b> {purpose[p.index]}</div>}
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

      {showFix && fixes && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(37,34,41,.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} className="sans">
          <div style={{ background: "#fff", borderRadius: 14, padding: 22, width: "min(600px,94vw)", maxHeight: "88vh", overflow: "auto" }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>What to fix</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>Grounded in established editorial principles. Each suggestion points at the specific place in your text.</div>
            {[["Recommended", fixes.recommended], ["Advanced", fixes.advanced]].map(([label, list]) => (
              <div key={label as string}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", margin: "14px 0 6px" }}>{label as string}</div>
                {(list as FixSuggestion[]).map((s) => (
                  <div key={s.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 8, opacity: s.found ? 1 : 0.6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                      {s.found && <button className="btn primary" style={{ fontSize: 12 }} onClick={() => runTasks(s.tasks, "document")}>Fix this</button>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, fontStyle: "italic" }}>{s.principle}</div>
                    <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>{s.source}</div>
                    {s.found ? (
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5 }}>{s.evidence.slice(0, 4).map((e, i) => <li key={i}>{e}</li>)}</ul>
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--sage)", marginTop: 4 }}>Nothing of this kind found. No change needed.</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div style={{ textAlign: "right", marginTop: 12 }}><button className="btn" onClick={() => setShowFix(false)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
