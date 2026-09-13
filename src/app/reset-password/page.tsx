"use client";

import { useState } from "react";
import { useAuth } from "@/lib/authContext";

/**
 * Reset-password page. The user arrives here from the emailed reset link;
 * Supabase establishes a temporary session, and updateUser sets the new
 * password. Kept deliberately simple and self-contained.
 */
export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setMsg(null);
    if (password.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setMsg("Passwords do not match."); return; }
    setBusy(true);
    try {
      const { error } = await updatePassword(password);
      if (error) setMsg(error);
      else setDone(true);
    } finally { setBusy(false); }
  }

  return (
    <div className="sans" style={{ maxWidth: 400, margin: "12vh auto", padding: 24 }}>
      <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Set a new password</div>
        {done ? (
          <div>
            <div style={{ color: "var(--sage)", fontSize: 14, margin: "12px 0" }}>Your password has been updated.</div>
            <a href="/" className="btn primary" style={{ display: "inline-block", padding: "8px 14px", textDecoration: "none" }}>Go to HumanWrite</a>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>Enter your new password below.</div>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="New password" autoComplete="new-password"
              style={{ width: "100%", padding: 9, marginBottom: 8, borderRadius: 7, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14 }} />
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="Confirm new password" autoComplete="new-password"
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              style={{ width: "100%", padding: 9, marginBottom: 12, borderRadius: 7, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14 }} />
            {msg && <div style={{ color: "var(--terra)", fontSize: 12.5, marginBottom: 10 }}>{msg}</div>}
            <button className="btn primary" style={{ width: "100%", padding: 10 }} onClick={submit} disabled={busy}>{busy ? "Updating..." : "Update password"}</button>
          </>
        )}
      </div>
    </div>
  );
}
