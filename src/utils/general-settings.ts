import type { KeyRule } from "@/src/types";
import { DEFAULT_SETTINGS } from "@/src/types";

export interface GeneralSettings {
  disableDeletion: boolean;
  keyRule: KeyRule;
  disableAutoFormat: boolean;
}

const STORAGE_KEY = "dictionary_general_settings";

export function loadGeneralSettings(): GeneralSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      disableDeletion: parsed.disableDeletion ?? DEFAULT_SETTINGS.disableDeletion,
      keyRule: parsed.keyRule ?? DEFAULT_SETTINGS.keyRule,
      disableAutoFormat: parsed.disableAutoFormat ?? DEFAULT_SETTINGS.disableAutoFormat,
    };
  } catch {
    return null;
  }
}

export function saveGeneralSettings(settings: GeneralSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
