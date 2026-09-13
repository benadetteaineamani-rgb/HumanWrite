"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
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
        <a href="/dashboard" className="sans" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", marginLeft: 16 }}>Command Centre</a>
        <AccountControl />
      </header>
      <AccessGate />
    </div>
  );
}

function AccessGate() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"checking" | "ok" | "pending" | "rejected" | "anon">("checking");

  useEffect(() => {
    if (loading) return;
    if (!user) { setStatus("anon"); return; }
    fetch("/api/me").then((r) => r.json()).then((d) => {
      if (!d.signedIn) setStatus("anon");
      else if (d.accessStatus === "APPROVED" || d.isAdmin) setStatus("ok");
      else if (d.accessStatus === "REJECTED") setStatus("rejected");
      else setStatus("pending");
    }).catch(() => setStatus("ok")); // fail open to the editor if the check errors
  }, [user, loading]);

  if (status === "checking") return <div className="sans" style={{ padding: 40, color: "var(--muted)" }}>Loading…</div>;

  // Anonymous users can still use the editor locally (they just can't save).
  if (status === "anon" || status === "ok") return <Editor />;

  const box = (title: string, body: string) => (
    <div className="sans" style={{ maxWidth: 460, margin: "12vh auto", textAlign: "center", padding: 24 }}>
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 28 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{body}</div>
      </div>
    </div>
  );

  if (status === "pending") return box("Your access is awaiting approval", "Thanks for signing up to the HumanWrite pilot. An administrator will review your request shortly. You'll be able to sign in and start writing once you're approved.");
  return box("Access not available", "Your account isn't currently approved for the pilot. If you think this is a mistake, please contact the administrator who invited you.");
}
