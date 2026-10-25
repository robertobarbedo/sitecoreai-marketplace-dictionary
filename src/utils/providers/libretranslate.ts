import type { TranslationSettings } from "@/src/types";
import { authedFetch } from "@/src/lib/marketplace-auth/authedFetch";
import type { TranslationRequest, TranslationResult, TranslationProvider } from "./types";

export const libreTranslateProvider: TranslationProvider = {
  async translate(
    request: TranslationRequest,
    settings: TranslationSettings
  ): Promise<TranslationResult[]> {
    if (!settings.libreTranslateUrl) {
      throw new Error("LibreTranslate server URL is not configured");
    }

    const response = await authedFetch("/api/translate/libretranslate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        libreTranslateUrl: settings.libreTranslateUrl,
        libreTranslateApiKey: settings.libreTranslateApiKey,
        phrase: request.phrase,
        baseLanguage: request.baseLanguage,
        targetLanguages: request.targetLanguages,
      }),
    });

    if (!response.ok) {
      let summary = `LibreTranslate error ${response.status}`;
      try {
        const body = await response.json();
        if (body?.detail) summary = `LibreTranslate error ${response.status}: ${body.detail}`;
        else if (body?.error) summary = `LibreTranslate error ${response.status}: ${body.error}`;
      } catch {
        // fall back to status only
      }
      throw new Error(summary);
    }

    const results = await response.json();

    if (!Array.isArray(results)) {
      throw new Error("Unexpected response format from LibreTranslate endpoint");
    }

    return results as TranslationResult[];
  },
};
