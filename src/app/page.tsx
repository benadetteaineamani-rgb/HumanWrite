"use client";

import dynamic from "next/dynamic";

// The editor is client-only (ProseMirror needs the DOM).
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

export default function Home() {
  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--line)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div className="sans" style={{ fontWeight: 700, fontSize: 18, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 7, padding: "3px 7px", fontSize: 12 }}>HW</span>
          HumanWrite
        </div>
        <div className="sans" style={{ fontSize: 12, color: "var(--muted)" }}>A structural writing studio</div>
      </header>
      <Editor />
    </div>
  );
}