"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import type { User } from "@supabase/supabase-js";

/**
 * Auth context (Stage 2 §9). A single place the app reads the current user and
 * performs sign up / in / out — so authentication is not scattered through
 * components. Degrades gracefully: if Supabase env vars are absent, the app runs
 * in anonymous mode and simply doesn't offer accounts.
 */

interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = typeof window !== "undefined" ? createClient() : null;
  const configured = !!supabase;

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data }) => { setUser(data.user ?? null); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Accounts are not enabled yet." };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // If confirmation is required, there is a user but no session yet.
    const needsConfirmation = !!data.user && !data.session;
    return { needsConfirmation };
  }, [supabase]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: "Accounts are not enabled yet." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loading, configured, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
