import type { TranslationSettings } from "@/src/types";

export interface TranslationRequest {
  siteName: string;
  dictionaryName: string;
  name: string;
  key: string;
  phrase: string;
  baseLanguage: string;
  description: string;
  targetLanguages: string[];
}

export interface TranslationResult {
  languageCode: string;
  translation: string;
}

export interface TranslationProvider {
  translate(
    request: TranslationRequest,
    settings: TranslationSettings
  ): Promise<TranslationResult[]>;
}
