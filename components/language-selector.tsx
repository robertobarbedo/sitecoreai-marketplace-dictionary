"use client";

import { LANGUAGE_DISPLAY_NAMES } from "@/src/constants";

interface LanguageSelectorProps {
  value: string;
  languages: string[];
  onChange: (language: string) => void;
}

function getLanguageLabel(code: string): string {
  return LANGUAGE_DISPLAY_NAMES[code] ?? code;
}

export function LanguageSelector({ value, languages, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-subtle">Display Phrase:</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-white border border-border-muted px-4 py-2 pr-10 rounded-lg font-mono text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
        >
          {languages.map((code) => (
            <option key={code} value={code}>
              {getLanguageLabel(code)}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-subtle text-[18px]">
          expand_more
        </span>
      </div>
    </div>
  );
}
