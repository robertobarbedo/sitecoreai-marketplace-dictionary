import type { TranslationSettings } from "@/src/types";
import { authedFetch } from "@/src/lib/marketplace-auth/authedFetch";
import type { TranslationRequest, TranslationResult, TranslationProvider } from "./types";

export const googleProvider: TranslationProvider = {
  async translate(
    request: TranslationRequest,
    settings: TranslationSettings
  ): Promise<TranslationResult[]> {
    if (!settings.googleApiKey) {
      throw new Error("Google Cloud Translation API key is not configured");
    }

    const response = await authedFetch("/api/translate/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleApiKey: settings.googleApiKey,
        phrase: request.phrase,
        baseLanguage: request.baseLanguage,
        targetLanguages: request.targetLanguages,
      }),
    });

    if (!response.ok) {
      let summary = `Google Translate error ${response.status}`;
      try {
        const body = await response.json();
        if (body?.detail) summary = `Google Translate error ${response.status}: ${body.detail}`;
        else if (body?.error) summary = `Google Translate error ${response.status}: ${body.error}`;
      } catch {
        // fall back to status only
      }
      throw new Error(summary);
    }

    const results = await response.json();

    if (!Array.isArray(results)) {
      throw new Error("Unexpected response format from Google Translate endpoint");
    }

    return results as TranslationResult[];
  },
};
