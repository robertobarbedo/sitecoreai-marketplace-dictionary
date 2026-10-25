import type { TranslationSettings } from "@/src/types";
import { authedFetch } from "@/src/lib/marketplace-auth/authedFetch";
import type { TranslationRequest, TranslationResult, TranslationProvider } from "./types";

export const openAIProvider: TranslationProvider = {
  async translate(
    request: TranslationRequest,
    settings: TranslationSettings
  ): Promise<TranslationResult[]> {
    const response = await authedFetch("/api/translate/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: settings.openAIApiKey,
        model: settings.openAIModel,
        siteName: request.siteName,
        dictionaryName: request.dictionaryName,
        name: request.name,
        key: request.key,
        phrase: request.phrase,
        baseLanguage: request.baseLanguage,
        description: request.description,
        targetLanguages: request.targetLanguages,
      }),
    });

    if (!response.ok) {
      let summary = `OpenAI error ${response.status}`;
      try {
        const body = await response.json();
        if (body?.detail) summary = `OpenAI error ${response.status}: ${body.detail}`;
        else if (body?.error) summary = `OpenAI error ${response.status}: ${body.error}`;
      } catch {
        // fall back to status only
      }
      throw new Error(summary);
    }

    const results = await response.json();

    if (!Array.isArray(results)) {
      throw new Error("Unexpected response format from OpenAI provider");
    }

    return results as TranslationResult[];
  },
};
