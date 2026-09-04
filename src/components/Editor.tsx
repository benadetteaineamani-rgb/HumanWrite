"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState, useCallback } from "react";
import { analyseDocument, DocumentDiagnostic } from "@/lib/diagnostics/engine";
import { api, HumanWriteAPIError } from "@/lib/apiClient";

/**
 * The HumanWrite authoring surface (§12). A real ProseMirror/Tiptap editor —
 * not contenteditable. Local diagnostics run instantly and offline (§5, §27);
 * AI actions call the backend and present a proposal the user accepts or
 * rejects (§19). AI failure never destroys work.
 */
export default function Editor() {
  const [diag, setDiag] = useState<DocumentDiagnostic | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ original: string; revised: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState<"checking" | "available" | "unavailable">("checking");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write, paste or upload something worth refining." }),
    ],
    content: "",
    immediatelyRender: false,
  });

  // Local review — always available, no network (§5, §27).
  const runReview = useCallback(() => {
    if (!editor) return;
    setDiag(analyseDocument(editor.getText()));
  }, [editor]);

  useEffect(() => {
    api.health().then((h) => setAiStatus(h.ai === "available" ? "available" : "unavailable")).catch(() => setAiStatus("unavailable"));
  }, []);

  // AI rewrite of the whole document — proposes, never auto-applies (§19).
  async function improve() {
    if (!editor) return;
    runReview();
    const text = editor.getText();
    if (!text.trim()) { setBanner("Write something first."); return; }
    setBusy(true); setBanner(null);
    try {
      const { proposal } = await api.rewrite({
        text, tasks: ["fixOpenings", "removeRepetition", "removeEmpty", "preserveVoice"],
        mode: "Academic", intensity: "Standard Edit", scope: "document",
      });
      setProposal({ original: text, revised: proposal });
    } catch (e) {
      const msg = e instanceof HumanWriteAPIError ? e.message : "The edit could not complete. Your text is unchanged.";
      setBanner(msg);
    } finally { setBusy(false); }
  }

  function acceptProposal() {
    if (!editor || !proposal) return;
    editor.commands.setContent(
      proposal.revised.split(/\n{2,}/).map((p) => `<p>${p.replace(/</g, "&lt;")}</p>`).join("")
    );
    setProposal(null);
    runReview();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 24, padding: 24 }}>
      {banner && (
        <div className="banner err">
          {banner}
          <button onClick={() => setBanner(null)} style={{ position: "absolute", right: 14, top: 10, background: "none", border: "none", color: "#7a3a30", fontSize: 15 }}>✕</button>
        </div>
      )}

      <main>
        <div className="sans" style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <button className="btn" onClick={runReview}>Review</button>
          <button className="btn primary" onClick={improve} disabled={busy}>{busy ? "Revising…" : "Improve"}</button>
          <span style={{ fontSize: 12, color: aiStatus === "available" ? "var(--sage)" : "var(--gold)", marginLeft: "auto" }}>
            ● {aiStatus === "available" ? "AI editing ready" : aiStatus === "checking" ? "Checking…" : "Review works · AI needs configuration"}
          </span>
        </div>
        <EditorContent editor={editor} />
      </main>

      <aside className="sans">
        {proposal ? (
          <div>
            <h3 style={{ fontSize: 14 }}>Proposed revision</h3>
            <div style={{ background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: 8, padding: 12, fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{proposal.revised}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn primary" onClick={acceptProposal}>Accept</button>
              <button className="btn" onClick={() => setProposal(null)}>Reject</button>
            </div>
          </div>
        ) : diag ? (
          <div>
            <h3 style={{ fontSize: 14 }}>Review</h3>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
              {diag.counts.words} words · {diag.counts.sentences} sentences · {diag.counts.paragraphs} paragraphs
            </div>
            {diag.paragraphs.map((p) => (
              <div key={p.index} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                  <span>Paragraph {p.index + 1}</span>
                  <span style={{ color: p.health === "Strong" ? "var(--sage)" : p.health === "Needs Editing" ? "var(--gold)" : "var(--terra)" }}>{p.health}</span>
                </div>
                {p.openings.diversity !== "High" && (
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
                    Repeated openings{p.openings.dominantArchetype ? ` — ${p.openings.dominantArchetype[1]} sentences share one grammatical shape` : ""}.
                  </div>
                )}
                {p.emptyStory > 0 && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{p.emptyStory} passage(s) of atmosphere without a concrete event.</div>}
                {p.health === "Strong" && p.openings.diversity === "High" && <div style={{ fontSize: 12.5, color: "var(--sage)", marginTop: 4 }}>Specific and clear. No edit recommended.</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Press Review to examine your manuscript. Works offline.</div>
        )}
      </aside>
    </div>
  );
}
