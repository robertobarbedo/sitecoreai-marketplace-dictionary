export interface SitecoreItem {
  itemId: string;
  name: string;
  path: string;
  fields?: { nodes: { name: string; value: string }[] };
}

export interface Site {
  name: string;
  rootPath: string;
  rootItem?: { itemId: string };
}

export interface DictionaryFolder {
  itemId: string;
  name: string;
  path: string;
  hasChildren?: boolean;
}

export interface DictionaryEntry {
  itemId: string;
  name: string;
  path: string;
  key: string;
  phrase: string;
  basePhrase: string;
  status: "ok" | "missing-translation";
}

export interface LanguageItem {
  code: string;
  itemId: string;
}

export interface DictionarySettings {
  baseLanguage: string;
  availableLanguages: string[];
  disableDeletion: boolean;
  keyRule: KeyRule;
  disableAutoFormat: boolean;
}

export type KeyRule =
  | "PascalCase"
  | "camelCase"
  | "dot.notation"
  | "DOT.NOTATION"
  | "snake_case"
  | "UPPER_SNAKE"
  | "kebab-case"
  | "UPPER_KEBAB"
  | "Title Case"
  | "lowercase";

export const DEFAULT_SETTINGS: DictionarySettings = {
  baseLanguage: "en",
  availableLanguages: [],
  disableDeletion: false,
  keyRule: "camelCase",
  disableAutoFormat: false,
};

export interface AppContext {
  name?: string;
  resourceAccess?: Array<{ context?: { preview?: string } }>;
  [key: string]: unknown;
}

export const TRANSLATION_PROVIDERS = ["openai", "anthropic", "google", "custom"] as const;

export type TranslationProviderType = (typeof TRANSLATION_PROVIDERS)[number];

export interface TranslationSettings {
  provider: TranslationProviderType;
  openAIApiKey: string;
  openAIModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  customUrl: string;
  googleApiKey: string;
}

export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  provider: "openai",
  openAIApiKey: "",
  openAIModel: "gpt-5-nano",
  anthropicApiKey: "",
  anthropicModel: "claude-opus-5-5",
  customUrl: "",
  googleApiKey: "",
};
