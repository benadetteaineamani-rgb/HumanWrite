/**
 * Client-side API wrapper. This is what replaces window.claude.complete (§1).
 * The browser never talks to any model vendor directly — only to HumanWrite's
 * own backend. No API keys exist here (§2). All failures return a clear,
 * typed error the UI can show without losing the user's work (§27).
 */

export class HumanWriteAPIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new HumanWriteAPIError(
      "Couldn't reach HumanWrite's server. Your document and local review tools are unaffected.",
      0
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new HumanWriteAPIError(
      (data && data.error) || `Request failed (${res.status}).`,
      res.status
    );
  }
  return data as T;
}

export const api = {
  rewrite: (input: {
    text: string;
    tasks: string[];
    mode: string;
    intensity: string;
    documentType?: string;
    voiceProfileId?: string;
    voiceStrength?: number;
    scope?: "selection" | "block" | "document";
  }) => post<{ proposal: string; notes: string | null }>("/api/rewrite", input),

  analyse: (input: { kind: string; text: string; context?: string }) =>
    post<{ result: Record<string, unknown> }>("/api/analyse", input),

  editorialQuestion: (input: { question: string; text: string }) =>
    post<{ answer: string }>("/api/editorial-question", input),

  createVoice: (input: { name: string; samples: string[] }) =>
    post<{ id: string; name: string; profile: Record<string, unknown> }>(
      "/api/style-profile",
      input
    ),

  compareStyles: (input: { text: string; voices: string[] }) =>
    post<{ variants: { voice: string; text: string }[] }>(
      "/api/compare-styles",
      input
    ),

  saveDocument: (input: {
    id?: string;
    title: string;
    documentType: string;
    contentJson: unknown;
    plainText: string;
    writingMode: string;
  }) => post<{ id: string; updatedAt: string }>("/api/documents", input),

  async health() {
    const res = await fetch("/api/health");
    return res.json() as Promise<{
      app: string;
      ai: string;
      database: string;
    }>;
  },
};
