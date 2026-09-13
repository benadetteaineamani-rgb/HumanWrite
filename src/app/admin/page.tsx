"use client";

import { useEffect, useState, useCallback } from "react";

interface AdminUser {
  id: string; email: string | null; name: string | null;
  isAdmin: boolean; accessStatus: string; plan: string; createdAt: string; approvedAt: string | null;
}

/**
 * Admin dashboard (pilot onboarding). Lists everyone who has signed up and lets
 * an admin approve access, reject, and grant/revoke admin. The page itself is
 * guarded server-side by /api/admin (403 for non-admins); this UI just reflects
 * that. Non-admins see an access-denied message.
 */
export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin").then(async (r) => {
      if (r.status === 403) { setState("denied"); return; }
      if (!r.ok) { setState("error"); return; }
      const d = await r.json();
      setUsers(d.users || []); setState("ready");
    }).catch(() => setState("error"));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(userId: string, action: string) {
    setBusyId(userId);
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action }) });
      if (r.ok) load();
    } finally { setBusyId(null); }
  }

  const pill = (s: string) => {
    const c = s === "APPROVED" ? "var(--sage)" : s === "REJECTED" ? "var(--terra)" : "var(--gold)";
    return <span style={{ fontSize: 11, color: c, fontWeight: 600 }}>{s.toLowerCase()}</span>;
  };

  return (
    <div className="sans" style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin — pilot access</h1>
        <a href="/" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>Back to app</a>
      </div>

      {state === "loading" && <div style={{ color: "var(--muted)" }}>Loading…</div>}
      {state === "denied" && <div style={{ background: "var(--accent-soft)", padding: 16, borderRadius: 10, fontSize: 14 }}>This page is for administrators only.</div>}
      {state === "error" && <div style={{ color: "var(--terra)" }}>Couldn&apos;t load users.</div>}

      {state === "ready" && (
        <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          {users.map((u, i) => (
            <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.email || "—"} {u.isAdmin && <span style={{ fontSize: 10, color: "#fff", background: "var(--accent)", borderRadius: 20, padding: "1px 7px", marginLeft: 6 }}>admin</span>}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{pill(u.accessStatus)} · {u.plan.toLowerCase()} · joined {new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
              {u.accessStatus !== "APPROVED" && <button className="btn primary" style={{ fontSize: 12 }} disabled={busyId === u.id} onClick={() => act(u.id, "approve")}>Approve</button>}
              {u.accessStatus !== "REJECTED" && <button className="btn" style={{ fontSize: 12 }} disabled={busyId === u.id} onClick={() => act(u.id, "reject")}>Reject</button>}
              {u.isAdmin
                ? <button className="btn" style={{ fontSize: 12 }} disabled={busyId === u.id} onClick={() => act(u.id, "revokeAdmin")}>Revoke admin</button>
                : <button className="btn" style={{ fontSize: 12 }} disabled={busyId === u.id} onClick={() => act(u.id, "makeAdmin")}>Make admin</button>}
            </div>
          ))}
          {users.length === 0 && <div style={{ padding: 16, color: "var(--muted)", fontSize: 14 }}>No users yet.</div>}
        </div>
      )}
    </div>
  );
}
