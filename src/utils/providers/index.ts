import type { TranslationSettings } from "@/src/types";
import type { TranslationRequest, TranslationResult } from "./types";
import { openAIProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { customProvider } from "./custom";
import { googleProvider } from "./google";

export type { TranslationRequest, TranslationResult } from "./types";

export async function translate(
  request: TranslationRequest,
  settings: TranslationSettings
): Promise<TranslationResult[]> {
  switch (settings.provider) {
    case "openai":
      return openAIProvider.translate(request, settings);
    case "anthropic":
      return anthropicProvider.translate(request, settings);
    case "custom":
      return customProvider.translate(request, settings);
    case "google":
      return googleProvider.translate(request, settings);
    default:
      throw new Error(`Unknown translation provider: ${settings.provider}`);
  }
}
