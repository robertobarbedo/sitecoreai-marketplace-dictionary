import type { TranslationSettings } from "@/src/types";
import { authedFetch } from "@/src/lib/marketplace-auth/authedFetch";
import type { TranslationRequest, TranslationResult, TranslationProvider } from "./types";

export const customProvider: TranslationProvider = {
  async translate(
    request: TranslationRequest,
    settings: TranslationSettings
  ): Promise<TranslationResult[]> {
    if (!settings.customUrl) {
      throw new Error("Custom translation URL is not configured");
    }

    const response = await authedFetch("/api/translate/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customUrl: settings.customUrl,
        siteName: request.siteName,
        dictionaryName: request.dictionaryName,
        key: request.key,
        phrase: request.phrase,
        baseLanguage: request.baseLanguage,
        description: request.description,
        targetLanguages: request.targetLanguages,
      }),
    });

    if (!response.ok) {
      let summary = `Custom translation error ${response.status}`;
      try {
        const body = await response.json();
        if (body?.detail) summary = `Custom translation error ${response.status}: ${body.detail}`;
        else if (body?.error) summary = `Custom translation error ${response.status}: ${body.error}`;
      } catch {
        // fall back to status only
      }
      throw new Error(summary);
    }

    const results = await response.json();

    if (!Array.isArray(results)) {
      throw new Error("Unexpected response format from custom translation endpoint");
    }

    return results as TranslationResult[];
  },
};
