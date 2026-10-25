"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { DictionaryEntry, TranslationSettings } from "@/src/types";
import { queryItemById, updateItemField, addItemVersion } from "@/src/utils/sitecore-graphql";
import { translate } from "@/src/utils/providers";
import { Button } from "@/components/ui/button";
import { mdiTranslate } from "@mdi/js";
import { Icon } from "@/lib/icon";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";

const KNOWN_LANGUAGES: Record<string, { label: string; flag: string }> = {
  // English
  en: { label: "English", flag: "US" },
  "en-US": { label: "English (US)", flag: "US" },
  "en-GB": { label: "English (UK)", flag: "GB" },
  "en-CA": { label: "English (Canada)", flag: "CA" },
  "en-AU": { label: "English (Australia)", flag: "AU" },
  "en-NZ": { label: "English (New Zealand)", flag: "NZ" },
  "en-IE": { label: "English (Ireland)", flag: "IE" },
  // Spanish
  "es-ES": { label: "Spanish (Spain)", flag: "ES" },
  "es-MX": { label: "Spanish (Mexico)", flag: "MX" },
  "es-AR": { label: "Spanish (Argentina)", flag: "AR" },
  "es-CO": { label: "Spanish (Colombia)", flag: "CO" },
  // French
  "fr-FR": { label: "French (France)", flag: "FR" },
  "fr-CA": { label: "French (Canada)", flag: "CA" },
  "fr-BE": { label: "French (Belgium)", flag: "BE" },
  "fr-CH": { label: "French (Switzerland)", flag: "CH" },
  // German
  "de-DE": { label: "German (Germany)", flag: "DE" },
  "de-AT": { label: "German (Austria)", flag: "AT" },
  "de-CH": { label: "German (Switzerland)", flag: "CH" },
  // Portuguese
  "pt-BR": { label: "Portuguese (Brazil)", flag: "BR" },
  "pt-PT": { label: "Portuguese (Portugal)", flag: "PT" },
  // Italian
  "it-IT": { label: "Italian", flag: "IT" },
  // Dutch
  "nl-NL": { label: "Dutch (Netherlands)", flag: "NL" },
  "nl-BE": { label: "Dutch (Belgium)", flag: "BE" },
  // Nordic
  "da-DK": { label: "Danish", flag: "DK" },
  "nb-NO": { label: "Norwegian", flag: "NO" },
  "sv-SE": { label: "Swedish", flag: "SE" },
  "fi-FI": { label: "Finnish", flag: "FI" },
  // Eastern European
  "pl-PL": { label: "Polish", flag: "PL" },
  "cs-CZ": { label: "Czech", flag: "CZ" },
  "sk-SK": { label: "Slovak", flag: "SK" },
  "hu-HU": { label: "Hungarian", flag: "HU" },
  "ro-RO": { label: "Romanian", flag: "RO" },
  "hr-HR": { label: "Croatian", flag: "HR" },
  "bg-BG": { label: "Bulgarian", flag: "BG" },
  "uk-UA": { label: "Ukrainian", flag: "UA" },
  "ru-RU": { label: "Russian", flag: "RU" },
  // Asian
  "ja-JP": { label: "Japanese", flag: "JP" },
  "ko-KR": { label: "Korean", flag: "KR" },
  "zh-CN": { label: "Chinese (Simplified)", flag: "CN" },
  "zh-TW": { label: "Chinese (Traditional)", flag: "TW" },
  "zh-HK": { label: "Chinese (Hong Kong)", flag: "HK" },
  // Middle East
  "ar-SA": { label: "Arabic (Saudi Arabia)", flag: "SA" },
  "ar-AE": { label: "Arabic (UAE)", flag: "AE" },
  "he-IL": { label: "Hebrew", flag: "IL" },
  "tr-TR": { label: "Turkish", flag: "TR" },
  // South & Southeast Asia
  "hi-IN": { label: "Hindi", flag: "IN" },
  "th-TH": { label: "Thai", flag: "TH" },
  "vi-VN": { label: "Vietnamese", flag: "VN" },
  "id-ID": { label: "Indonesian", flag: "ID" },
  "ms-MY": { label: "Malay", flag: "MY" },
};

const BASE_LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  it: "Italian", nl: "Dutch", da: "Danish", nb: "Norwegian", sv: "Swedish",
  fi: "Finnish", pl: "Polish", cs: "Czech", sk: "Slovak", hu: "Hungarian",
  ro: "Romanian", hr: "Croatian", bg: "Bulgarian", uk: "Ukrainian", ru: "Russian",
  ja: "Japanese", ko: "Korean", zh: "Chinese", ar: "Arabic", he: "Hebrew",
  tr: "Turkish", hi: "Hindi", th: "Thai", vi: "Vietnamese", id: "Indonesian",
  ms: "Malay",
};

function resolveLanguage(code: string): { code: string; label: string; flag: string } {
  const known = KNOWN_LANGUAGES[code];
  if (known) return { code, ...known };

  const [base, region] = code.split("-");
  const baseName = BASE_LANGUAGE_NAMES[base.toLowerCase()] ?? base;
  const label = region ? `${baseName} (${region.toUpperCase()})` : baseName;
  const flag = region ?? base.toUpperCase().slice(0, 2);
  return { code, label, flag };
}

interface EntryEditorProps {
  client: ClientSDK;
  sitecoreContextId: string;
  entry: DictionaryEntry;
  baseLanguage: string;
  availableLanguages: string[];
  siteName: string;
  translationSettings: TranslationSettings | null;
  onBack: () => void;
  onFolderClick?: (folder: string) => void;
  showToast: (title: string, description: string, options?: { variant?: "default" | "success" | "error" | "warning"; link?: string; duration?: number }) => void;
}

interface LanguagePhrase {
  code: string;
  label: string;
  flag: string;
  phrase: string;
  originalPhrase: string;
  exists: boolean;
}

function getBreadcrumbFolders(path: string): string[] {
  const parts = path.split("/");
  const dictIndex = parts.findIndex((p) => p.toLowerCase() === "dictionary");
  if (dictIndex === -1) return [];
  return parts.slice(dictIndex + 1, parts.length - 1);
}

function evaluateLengthRisk(baseLen: number, transLen: number): boolean {
  if (baseLen === 0) return false;
  const surplus = transLen - baseLen;
  if (baseLen <= 10)  return transLen > baseLen * 3   && surplus > 15;
  if (baseLen <= 50)  return transLen > baseLen * 1.8 && surplus > 20;
  if (baseLen <= 120) return transLen > baseLen * 1.4 && surplus > 35;
  return               transLen > baseLen * 1.25      && surplus > 50;
}

export function EntryEditor({
  client,
  sitecoreContextId,
  entry,
  baseLanguage,
  availableLanguages,
  siteName,
  translationSettings,
  onBack,
  onFolderClick,
  showToast,
}: EntryEditorProps) {
  const editorLanguages = useMemo(
    () => availableLanguages.map(resolveLanguage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableLanguages.join(",")]
  );

  const [phrases, setPhrases] = useState<LanguagePhrase[]>([]);
  const [description, setDescription] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const hasChanges = useMemo(
    () => phrases.some((p) => p.phrase !== p.originalPhrase) || description !== originalDescription,
    [phrases, description, originalDescription]
  );

  useEffect(() => {
    async function loadPhrases() {
      setIsLoading(true);
      try {
        const results = await Promise.all(
          editorLanguages.map(async (lang) => {
            try {
              const item = await queryItemById(
                client,
                sitecoreContextId,
                entry.itemId,
                lang.code
              );
              const phraseValue =
                item?.fields?.nodes?.find((f) => f.name === "Phrase")?.value ?? "";
              if (lang.code === baseLanguage) {
                const desc =
                  item?.fields?.nodes?.find((f) => f.name === "__Long description")?.value ?? "";
                setDescription(desc);
                setOriginalDescription(desc);
              }
              return {
                code: lang.code,
                label: lang.label,
                flag: lang.flag,
                phrase: phraseValue,
                originalPhrase: phraseValue,
                exists: !!item,
              };
            } catch {
              return {
                code: lang.code,
                label: lang.label,
                flag: lang.flag,
                phrase: "",
                originalPhrase: "",
                exists: false,
              };
            }
          })
        );
        setPhrases(results);
      } catch (e) {
        console.error("Error loading phrases:", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadPhrases();
  }, [client, sitecoreContextId, entry.itemId, editorLanguages]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const handlePhraseChange = (code: string, value: string) => {
    setPhrases((prev) =>
      prev.map((p) => (p.code === code ? { ...p, phrase: value } : p))
    );
  };

  const showTranslationError = (e: unknown) => {
    const raw = e instanceof Error ? e.message : "An unexpected error occurred.";
    const urlMatch = raw.match(/https?:\/\/\S+/);
    const link = urlMatch?.[0];
    const message = link ? raw.replace(link, "").replace(/\.\s*$/, "").trimEnd() + "." : raw;
    showToast("Translation failed", message, { variant: "error", duration: 15000, ...(link ? { link } : {}) });
  };

  const isTranslationConfigured = (): boolean => {
    if (!translationSettings) return false;
    if (translationSettings.provider === "openai") return !!translationSettings.openAIApiKey;
    if (translationSettings.provider === "anthropic") return !!translationSettings.anthropicApiKey;
    if (translationSettings.provider === "custom") return !!translationSettings.customUrl;
    if (translationSettings.provider === "libretranslate") return !!translationSettings.libreTranslateUrl;
    if (translationSettings.provider === "google") return !!translationSettings.googleApiKey;
    return false;
  };

  const buildTranslationRequest = (targetLanguages: string[]) => ({
    siteName,
    dictionaryName: "Dictionary",
    name: entry.name,
    key: entry.key,
    phrase: phrases.find((p) => p.code === baseLanguage)?.phrase ?? "",
    baseLanguage,
    description,
    targetLanguages,
  });

  const handleTranslateAll = async () => {
    if (!translationSettings || !isTranslationConfigured()) return;
    const basePhrase = phrases.find((p) => p.code === baseLanguage)?.phrase ?? "";
    if (!basePhrase) {
      showToast("Cannot translate", "The base language phrase is empty. Add a phrase first.", { variant: "error" });
      return;
    }
    const missing = phrases.filter((p) => p.code !== baseLanguage && !p.phrase);
    if (missing.length === 0) {
      showToast("Nothing to translate", "All language phrases are already filled in.");
      return;
    }
    setTranslatingAll(true);
    try {
      const results = await translate(
        buildTranslationRequest(missing.map((p) => p.code)),
        translationSettings
      );
      setPhrases((prev) =>
        prev.map((p) => {
          const result = results.find((r) => r.languageCode === p.code);
          return result ? { ...p, phrase: result.translation } : p;
        })
      );
      showToast("Translations applied", `${results.length} phrase(s) translated automatically. Review them, then save.`, { variant: "success" });
    } catch (e) {
      console.error("Translation error:", e);
      showTranslationError(e);
    } finally {
      setTranslatingAll(false);
    }
  };

  const handleTranslateSingle = async (langCode: string) => {
    if (!translationSettings || !isTranslationConfigured()) return;
    const basePhrase = phrases.find((p) => p.code === baseLanguage)?.phrase ?? "";
    if (!basePhrase) {
      showToast("Cannot translate", "The base language phrase is empty. Add a phrase first.", { variant: "error" });
      return;
    }
    setTranslatingLang(langCode);
    try {
      const results = await translate(
        buildTranslationRequest([langCode]),
        translationSettings
      );
      const result = results.find((r) => r.languageCode === langCode);
      if (result) {
        setPhrases((prev) =>
          prev.map((p) => (p.code === langCode ? { ...p, phrase: result.translation } : p))
        );
        showToast("Translation applied", "Phrase translated automatically. Review it, then save.", { variant: "warning" });
      }
    } catch (e) {
      console.error("Translation error:", e);
      showTranslationError(e);
    } finally {
      setTranslatingLang(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const modifiedPhrases = phrases.filter(
        (p) => p.phrase !== p.originalPhrase
      );

      const saveOps: Promise<unknown>[] = modifiedPhrases.map(async (p) => {
        let result: unknown = null;
        try {
          result = await updateItemField(
            client,
            sitecoreContextId,
            entry.itemId,
            entry.path,
            "Phrase",
            p.phrase,
            p.code,
            1
          );
        } catch {
          // update may fail if no language version exists
        }

        if (!result) {
          await addItemVersion(client, sitecoreContextId, entry.itemId, p.code);
          result = await updateItemField(
            client,
            sitecoreContextId,
            entry.itemId,
            entry.path,
            "Phrase",
            p.phrase,
            p.code,
            1
          );
        }

        return result;
      });

      if (description !== originalDescription) {
        saveOps.push(
          updateItemField(
            client,
            sitecoreContextId,
            entry.itemId,
            entry.path,
            "__Long description",
            description,
            baseLanguage,
            1
          )
        );
      }

      await Promise.all(saveOps);

      const savedCount = modifiedPhrases.length + (description !== originalDescription ? 1 : 0);
      showToast("Changes saved", `Updated ${savedCount} field(s).`);
      setPhrases((prev) =>
        prev.map((p) => ({ ...p, originalPhrase: p.phrase }))
      );
      setOriginalDescription(description);
    } catch (e) {
      console.error("Error saving phrases:", e);
      showToast("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelClick = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      onBack();
    }
  };

  const handleSaveAndExit = async () => {
    await handleSave();
    setShowUnsavedDialog(false);
    onBack();
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    onBack();
  };

  const handleFolderClick = (folder: string) => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else if (onFolderClick) {
      onFolderClick(folder);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined animate-spin text-primary text-[32px]">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <main className="p-[--spacing-margin-page] py-10 min-h-screen bg-surface-bright">
      <div className="max-w-[1280px] mx-auto space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-text-subtle font-mono text-xs">
          <button onClick={handleCancelClick} className="hover:text-primary transition-colors cursor-pointer">
            Dictionary
          </button>
          {getBreadcrumbFolders(entry.path).map((folder) => (
            <Fragment key={folder}>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              {onFolderClick ? (
                <button
                  onClick={() => handleFolderClick(folder)}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  {folder}
                </button>
              ) : (
                <span>{folder}</span>
              )}
            </Fragment>
          ))}
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-primary font-bold">{entry.name}</span>
        </nav>

        {/* Header */}
        <div className="bg-white border border-border-muted rounded-xl p-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="font-mono text-xs text-text-subtle block mb-2">
                Entry Name
              </label>
              <input
                type="text"
                readOnly
                value={entry.name}
                className="w-full bg-surface-grey border border-border-muted rounded-lg px-4 py-3 text-sm cursor-not-allowed"
              />
            </div>
            <div className="flex-1">
              <label className="font-mono text-xs text-text-subtle block mb-2">
                Shared Key
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={entry.key}
                  className="w-full bg-surface-grey border border-border-muted rounded-lg px-4 py-3 font-mono text-xs text-primary font-bold cursor-not-allowed"
                />
                <span className="material-symbols-outlined absolute right-3 top-3 text-text-subtle text-[18px]">
                  lock
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <label className="font-mono text-xs text-text-subtle block mb-2">
              Description <span className="font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white border border-border-muted rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              placeholder="Helps clarify where this text appears and gives AI translators the context they need to produce accurate translations. e.g. Greeting shown on the homepage hero section. "
            />
          </div>
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {phrases.map((lang) => {
            const basePhrase = phrases.find((p) => p.code === baseLanguage);
            const baseLen = basePhrase?.phrase.length ?? 0;
            const isOverLength =
              lang.code !== baseLanguage &&
              evaluateLengthRisk(baseLen, lang.phrase.length);

            return (
            <div
              key={lang.code}
              className="bg-white border border-border-muted rounded-xl p-8 flex flex-col transition-colors hover:bg-[#f7f6ff] focus-within:bg-[#f7f6ff]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 bg-surface-grey rounded-sm overflow-hidden border border-border-muted flex items-center justify-center font-bold text-[10px] text-text-subtle px-1.5">
                    {lang.code}
                  </div>
                  <span className="text-sm font-bold text-on-surface">
                    {lang.label}
                  </span>
                </div>
                {lang.code === baseLanguage ? (
                  <span className="text-[10px] bg-tertiary-fixed text-primary px-2 py-1 rounded font-bold uppercase">
                    Base Language
                  </span>
                ) : isTranslationConfigured() ? (
                  <button
                    onClick={() => handleTranslateSingle(lang.code)}
                    disabled={
                      !phrases.find((p) => p.code === baseLanguage)?.phrase ||
                      translatingLang !== null ||
                      translatingAll
                    }
                    className="flex items-center gap-1.5 text-[11px] font-medium text-primary border border-primary/30 rounded-lg px-2.5 py-1 hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Translate this phrase using the configured provider"
                  >
                    {translatingLang !== lang.code && <Icon path={mdiTranslate} size={0.6} />}
                    {translatingLang === lang.code ? "Translating…" : "Translate"}
                  </button>
                ) : null}
              </div>
              <textarea
                value={lang.phrase}
                onChange={(e) => handlePhraseChange(lang.code, e.target.value)}
                rows={4}
                className="w-full bg-white border border-border-muted rounded-lg p-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none mx-1"
                placeholder={`Enter phrase in ${lang.label}...`}
              />
              <div className="mt-3 mx-1 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-text-subtle text-[11px]">
                  <span>Characters: {lang.phrase.length}</span>
                </div>
                {isOverLength && (
                  <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0">warning</span>
                    <span>
                      This translation has <strong>{lang.phrase.length} characters</strong> — significantly longer than the base language. Check that the interface can accommodate this text.
                    </span>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="pt-6 border-t border-border-muted flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isTranslationConfigured() && (
              <Button
                variant="outline"
                onClick={handleTranslateAll}
                disabled={
                  translatingAll ||
                  translatingLang !== null ||
                  !phrases.find((p) => p.code === baseLanguage)?.phrase
                }
              >
                {!translatingAll && <Icon path={mdiTranslate} size={0.75} />}
                {translatingAll ? "Translating…" : "Translate All Missing"}
              </Button>
            )}
            {isTranslationConfigured() && (
              <span className="text-[11px] text-text-subtle">
                {translationSettings?.provider === "openai" || translationSettings?.provider === "anthropic" ? "AI-generated" : "Machine-translated"} — review before saving.
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleCancelClick}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              <span className="material-symbols-outlined text-[18px]">save</span>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSave={handleSaveAndExit}
        onDiscard={handleDiscardChanges}
        isSaving={isSaving}
      />
    </main>
  );
}
