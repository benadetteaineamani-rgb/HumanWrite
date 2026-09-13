"use client";

import { useRef, useCallback, useState } from "react";
import { api, HumanWriteAPIError } from "@/lib/apiClient";

/**
 * Document persistence hook (Batch 1). Saves the current document to the backend
 * (which ties it to the signed-in user), debounced so we don't save on every
 * keystroke. Tracks the document id so subsequent saves update rather than
 * duplicate. Degrades gracefully: if the user is signed out, saving simply
 * reports "sign in to save" rather than losing work.
 */
export interface SaveState {
  status: "idle" | "saving" | "saved" | "error" | "signedout";
  message?: string;
  savedAt?: number;
}

export function useDocumentPersistence() {
  const docId = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const doSave = useCallback(async (payload: {
    title: string;
    documentType: string;
    contentJson: unknown;
    plainText: string;
    writingMode: string;
  }) => {
    setSaveState({ status: "saving" });
    try {
      const res = await api.saveDocument({ id: docId.current ?? undefined, ...payload });
      docId.current = res.id;
      setSaveState({ status: "saved", savedAt: Date.now() });
    } catch (e) {
      if (e instanceof HumanWriteAPIError && e.status === 401) {
        setSaveState({ status: "signedout", message: "Sign in to save your work." });
      } else {
        setSaveState({ status: "error", message: e instanceof Error ? e.message : "Save failed." });
      }
    }
  }, []);

  /** Debounced save — call on every meaningful change. */
  const scheduleSave = useCallback((payload: {
    title: string; documentType: string; contentJson: unknown; plainText: string; writingMode: string;
  }) => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState((s) => (s.status === "saved" ? { status: "idle" } : s));
    timer.current = setTimeout(() => doSave(payload), 1200);
  }, [doSave]);

  const currentId = () => docId.current;
  const setId = (id: string | null) => { docId.current = id; };

  return { saveState, scheduleSave, saveNow: doSave, currentId, setId };
}
