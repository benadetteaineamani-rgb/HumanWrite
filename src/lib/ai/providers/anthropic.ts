import Anthropic from "@anthropic-ai/sdk";
import {
  EditorialAIProvider,
  RewriteRequest,
  RewriteResponse,
  AnalysisRequest,
  AnalysisResponse,
  EditorialQuestionRequest,
  EditorialAnswer,
  VoiceProfileRequest,
  VoiceProfile,
  CompareStylesRequest,
  StyleComparison,
} from "../provider";
import {
  EDITORIAL_SYSTEM,
  MODE_GUIDANCE,
  INTENSITY_GUIDANCE,
  TASK_PROMPTS,
  modelForTier,
} from "../config";

/**
 * AnthropicProvider — the first concrete EditorialAIProvider (§7).
 *
 * This runs ONLY on the server. The API key is read from process.env and never
 * leaves the backend (§2). All prompts encode the HumanWrite philosophy (§29),
 * and analytical calls demand structured JSON that is validated before return
 * (§10).
 */
export class AnthropicProvider implements EditorialAIProvider {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not configured on the server. AI features are unavailable; local diagnostics are unaffected."
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  private buildRewriteSystem(req: RewriteRequest): string {
    const tasks = req.tasks
      .map((t) => TASK_PROMPTS[t])
      .filter(Boolean)
      .map((t) => `- ${t}`)
      .join("\n");

    let s = `${EDITORIAL_SYSTEM}

EDITORIAL TASKS REQUESTED:
${tasks || "- Apply a careful standard edit."}

MODE: ${req.mode}. ${MODE_GUIDANCE[req.mode] || ""}
INTENSITY: ${req.intensity}. ${INTENSITY_GUIDANCE[req.intensity] || ""}`;

    // Retrieval layer supplies only relevant principles (§17, §18) — never the whole library.
    if (req.principles && req.principles.length) {
      s += `\n\nRELEVANT WRITING-INTELLIGENCE PRINCIPLES (apply as editorial guidance, not rules to force):\n`;
      s += req.principles
        .map((p) => `- ${p.principle} (when weak: ${p.weak}; response: ${p.response}; never: ${p.doNot})`)
        .join("\n");
    }

    // Voice profile: higher-level characteristics only (§15).
    if (req.voiceProfile && (req.voiceStrength ?? 0) > 0) {
      s += `\n\nVOICE TARGET (influence ${req.voiceStrength}%). Reproduce these HIGHER-LEVEL traits only; never copy phrases:\n${
        req.voiceProfile.summary ||
        JSON.stringify(req.voiceProfile, null, 0)
      }`;
    }

    s += `\n\nOUTPUT: Return ONLY the revised prose. Preserve paragraph breaks. No commentary, headers or markdown fences.`;
    return s;
  }

  async rewrite(req: RewriteRequest): Promise<RewriteResponse> {
    const model = modelForTier(req.tier || "STANDARD");
    const message = await this.client.messages.create({
      model,
      max_tokens: 4000,
      system: this.buildRewriteSystem(req),
      messages: [
        {
          role: "user",
          content: `Revise the following. Return only the revised text.\n\n---\n${req.text}\n---`,
        },
      ],
    });
    const revised = textFrom(message).replace(/```[a-z]*\n?/gi, "").trim();
    if (!revised) throw new Error("The editor returned an empty response.");
    return { revised };
  }

  async analyse(req: AnalysisRequest): Promise<AnalysisResponse> {
    const model = modelForTier(req.tier || "STANDARD");
    const { system, user } = analysisPrompt(req);
    const message = await this.client.messages.create({
      model,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    });
    return parseJSON(textFrom(message));
  }

  async editorialQuestion(
    req: EditorialQuestionRequest
  ): Promise<EditorialAnswer> {
    const model = modelForTier(req.tier || "FAST");
    const message = await this.client.messages.create({
      model,
      max_tokens: 600,
      system: `${EDITORIAL_SYSTEM}\n\nAnswer the reader's editorial question about the passage concisely and specifically. Do not rewrite the passage unless asked.`,
      messages: [
        {
          role: "user",
          content: `Question: ${req.question}\n\nPassage:\n${req.text}`,
        },
      ],
    });
    return { answer: textFrom(message).trim() };
  }

  async createVoiceProfile(req: VoiceProfileRequest): Promise<VoiceProfile> {
    const model = modelForTier("STANDARD");
    const sample = req.samples.join("\n\n---\n\n").slice(0, 16000);
    const system = `You are a style analyst. Produce a STYLE PROFILE of higher-level characteristics only. Never quote a distinctive phrase from the sample. Respond ONLY with a valid JSON object in this exact shape:
{
  "sentence_length": {"tendency": "string", "variation": "string"},
  "sentence_architecture": {"description": "string"},
  "paragraph_density": {"description": "string"},
  "formality": {"level": "string"},
  "technicality": {"level": "string"},
  "first_person": {"frequency": "string"},
  "certainty": {"level": "string"},
  "rhetorical_questions": {"frequency": "string"},
  "metaphor_use": {"description": "string"},
  "transition_style": {"description": "string"},
  "preferred_spelling": "British | American",
  "banned_patterns": ["string"],
  "distinctive_tendencies": ["string"],
  "summary": "a short human-readable paragraph the user can read and edit"
}`;
    const message = await this.client.messages.create({
      model,
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: sample }],
    });
    return parseJSON(textFrom(message)) as VoiceProfile;
  }

  async compareStyles(req: CompareStylesRequest): Promise<StyleComparison> {
    // Concurrent generation (§9 spirit): one call per voice, in parallel.
    const model = modelForTier("STANDARD");
    const jobs = req.voices.map(async (voice) => {
      const profile = req.voiceProfiles?.[voice];
      const sys = `${EDITORIAL_SYSTEM}\n\nRewrite the passage in the "${voice}" register.${
        profile ? ` Higher-level voice traits: ${profile.summary || ""}` : ""
      }\nReturn ONLY the rewritten passage.`;
      const message = await this.client.messages.create({
        model,
        max_tokens: 1500,
        system: sys,
        messages: [{ role: "user", content: req.text }],
      });
      return { voice, text: textFrom(message).trim() };
    });
    const variants = await Promise.all(jobs);
    return { variants };
  }
}

/* ---------- helpers ---------- */

function textFrom(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function parseJSON(raw: string): Record<string, unknown> {
  // Strip fences and locate the first JSON object.
  const cleaned = raw.replace(/```[a-z]*\n?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) {
    throw new Error("Model did not return valid JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function analysisPrompt(req: AnalysisRequest): { system: string; user: string } {
  switch (req.kind) {
    case "conceptual-repetition":
      return {
        system: `${EDITORIAL_SYSTEM}\n\nDecide whether two passages make the same substantive contribution. Respond ONLY with JSON: {"classification":"REPEATED_IDEA|RELATED_BUT_DISTINCT|NECESSARY_RECURRENCE|CONTRADICTION","confidence":0.0,"reason":"string","recommended_action":"MERGE|KEEP|REVIEW","preserve":["string"]}`,
        user: req.text,
      };
    case "sentence-contribution":
      return {
        system: `${EDITORIAL_SYSTEM}\n\nEstimate each sentence's role and contribution. Respond ONLY with JSON: {"paragraph_purpose":"string","sentences":[{"id":"s1","role":"claim|evidence|interpretation|qualification|transition|restatement|decoration","contribution":"substantive|limited|none"}]}`,
        user: req.text,
      };
    case "paragraph-purpose":
      return {
        system: `${EDITORIAL_SYSTEM}\n\nState the single proposition this paragraph exists to make, in at most 12 words. Respond ONLY with JSON: {"proposition":"string"}`,
        user: req.text,
      };
    case "empty-storytelling":
      return {
        system: `${EDITORIAL_SYSTEM}\n\nDecide whether the passage is genuine storytelling (specific event/person/action/consequence) or empty (atmosphere without event). Respond ONLY with JSON: {"verdict":"GENUINE|EMPTY|MIXED","reason":"string","needs":"string"}`,
        user: req.text,
      };
    default:
      return { system: EDITORIAL_SYSTEM, user: req.text };
  }
}
