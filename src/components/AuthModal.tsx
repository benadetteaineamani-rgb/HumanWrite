"use client";

import { useState } from "react";
import { useAuth } from "@/lib/authContext";

/**
 * Auth modal (Stage 2). Email/password sign in and sign up. Handles both
 * confirmation-on and confirmation-off Supabase configurations: if confirmation
 * is required, it tells the user to check their email; if not, sign-up signs
 * them straight in.
 */
export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit() {
    setMsg(null); setOk(null);
    if (mode === "forgot") {
      if (!email) { setMsg("Enter your email."); return; }
      setBusy(true);
      try {
        const { error } = await requestPasswordReset(email);
        if (error) setMsg(error);
        else setOk("If an account exists for that email, a reset link is on its way. Check your inbox.");
      } finally { setBusy(false); }
      return;
    }
    if (!email || !password) { setMsg("Enter an email and password."); return; }
    if (password.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await signIn(email, password);
        if (error) setMsg(error); else onClose();
      } else {
        const { error, needsConfirmation } = await signUp(email, password);
        if (error) setMsg(error);
        else if (needsConfirmation) setOk("Account created. Check your email to confirm, then sign in.");
        else { setOk("Account created."); setTimeout(onClose, 600); }
      }
    } finally { setBusy(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(37,34,41,.42)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120 }} className="sans">
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: "min(400px,92vw)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Reset password"}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>
          {mode === "in" ? "Sign in to save your documents and voices across devices." : mode === "up" ? "Create an account to keep your work." : "Enter your email and we'll send you a link to set a new password."}
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email"
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          style={{ width: "100%", padding: 9, marginBottom: 8, borderRadius: 7, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14 }} />
        {mode !== "forgot" && (
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete={mode === "in" ? "current-password" : "new-password"}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            style={{ width: "100%", padding: 9, marginBottom: 12, borderRadius: 7, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14 }} />
        )}
        {mode === "in" && (
          <div style={{ textAlign: "right", marginBottom: 10 }}>
            <button onClick={() => { setMode("forgot"); setMsg(null); setOk(null); }} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Forgot password?</button>
          </div>
        )}
        {msg && <div style={{ color: "var(--terra)", fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}
        {ok && <div style={{ color: "var(--sage)", fontSize: 12.5, marginBottom: 10 }}>{ok}</div>}
        <button className="btn primary" style={{ width: "100%", padding: 10 }} onClick={submit} disabled={busy}>
          {busy ? "Please wait..." : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
        </button>
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 13 }}>
          {mode === "in" ? (
            <span>New here? <button onClick={() => { setMode("up"); setMsg(null); }} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Create an account</button></span>
          ) : (
            <span>{mode === "forgot" ? "Remembered it? " : "Have an account? "}<button onClick={() => { setMode("in"); setMsg(null); }} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign in</button></span>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5 }}>Continue without an account</button>
        </div>
      </div>
    </div>
  );
}
