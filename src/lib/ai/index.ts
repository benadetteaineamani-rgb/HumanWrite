import { EditorialAIProvider } from "./provider";
import { AnthropicProvider } from "./providers/anthropic";

/**
 * Provider factory. The rest of the application asks for "the provider" and
 * never names a vendor (§28). Adding OpenAIProvider / GoogleProvider later is a
 * one-line change here — no route or component changes.
 */
let cached: EditorialAIProvider | null = null;

export function getProvider(): EditorialAIProvider {
  if (cached) return cached;
  const which = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  switch (which) {
    case "anthropic":
      cached = new AnthropicProvider();
      break;
    // case "openai": cached = new OpenAIProvider(); break;
    // case "google": cached = new GoogleProvider(); break;
    default:
      throw new Error(`Unknown AI_PROVIDER: ${which}`);
  }
  return cached;
}

/** True when AI is configured. Used by /api/health and graceful degradation (§26, §27). */
export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export * from "./provider";
