"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import AuthModal from "@/components/AuthModal";

// The editor is client-only (ProseMirror needs the DOM).
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

function AccountControl() {
  const { user, loading, configured, signOut } = useAuth();
  const [show, setShow] = useState(false);
  if (loading) return null;
  return (
    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
      {user ? (
        <>
          <span className="sans" style={{ fontSize: 12.5, color: "var(--muted)" }}>{user.email}</span>
          <button className="btn" onClick={() => signOut()}>Sign out</button>
        </>
      ) : (
        <button className="btn primary" onClick={() => setShow(true)}>
          {configured ? "Sign in" : "Sign in"}
        </button>
      )}
      {show && <AuthModal onClose={() => setShow(false)} />}
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--line)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div className="sans" style={{ fontWeight: 700, fontSize: 18, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 7, padding: "3px 7px", fontSize: 12 }}>HW</span>
          HumanWrite
        </div>
        <div className="sans" style={{ fontSize: 12, color: "var(--muted)" }}>A structural writing studio</div>
        <AccountControl />
      </header>
      <Editor />
    </div>
  );
}
