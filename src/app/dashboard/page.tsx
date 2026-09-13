"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";

interface DocRow { id: string; title: string; documentType: string; words: number; updatedAt: string; createdAt: string; }
interface SharedRow { id: string; title: string; documentType: string; role: string; updatedAt: string; }

/**
 * Command Centre (dashboard). A work-in-progress overview: the writer's own
 * documents with word counts, type and last-edited, plus documents shared with
 * them. Read-only view that opens a document in the editor. Progress is shown
 * honestly from real saved data — nothing is invented.
 */
export default function Dashboard() {
  const { user, loading } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [shared, setShared] = useState<SharedRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (loading) return;
    fetch("/api/documents").then((r) => r.json()).then((d) => {
      setDocs(d.documents || []); setShared(d.shared || []); setState("ready");
    }).catch(() => setState("error"));
  }, [loading]);

  const totalWords = docs.reduce((n, d) => n + d.words, 0);
  const fmt = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="sans" style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Command Centre</h1>
        <a href="/" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>+ New document</a>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Your work in progress. {docs.length} document(s) · {totalWords.toLocaleString()} words in total.</p>

      {!user && state === "ready" && (
        <div style={{ background: "var(--accent-soft)", padding: 16, borderRadius: 10, fontSize: 14 }}>Sign in to see your saved documents here.</div>
      )}

      {state === "loading" && <div style={{ color: "var(--muted)" }}>Loading…</div>}
      {state === "error" && <div style={{ color: "var(--terra)" }}>Couldn&apos;t load your documents. Try refreshing.</div>}

      {state === "ready" && user && docs.length === 0 && (
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: 20, fontSize: 14, color: "var(--muted)" }}>
          No documents yet. <a href="/" style={{ color: "var(--accent)" }}>Start writing</a> — your work will appear here.
        </div>
      )}

      {state === "ready" && docs.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", marginBottom: 8 }}>My documents</h2>
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            {docs.map((d, i) => (
              <a key={d.id} href={`/?doc=${d.id}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 16, alignItems: "center", padding: "12px 16px", borderTop: i ? "1px solid var(--line)" : "none", textDecoration: "none", color: "var(--ink)" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{d.title || "Untitled"}</span>
                <span style={{ fontSize: 12, color: "var(--accent)", textTransform: "capitalize" }}>{d.documentType.replace(/-/g, " ")}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{d.words.toLocaleString()} words</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmt(d.updatedAt)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {state === "ready" && shared.length > 0 && (
        <div>
          <h2 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)", marginBottom: 8 }}>Shared with me</h2>
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
            {shared.map((d, i) => (
              <a key={d.id} href={`/?doc=${d.id}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, alignItems: "center", padding: "12px 16px", borderTop: i ? "1px solid var(--line)" : "none", textDecoration: "none", color: "var(--ink)" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{d.title || "Untitled"}</span>
                <span style={{ fontSize: 11, color: "#fff", background: "var(--accent)", borderRadius: 20, padding: "2px 8px", textTransform: "capitalize" }}>{d.role.toLowerCase()}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{fmt(d.updatedAt)}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
