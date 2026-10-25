"use client";

import { useState, useEffect } from "react";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { Site, LanguageItem, DictionarySettings, TranslationSettings, TranslationProviderType } from "@/src/types";
import { DEFAULT_SETTINGS, DEFAULT_TRANSLATION_SETTINGS } from "@/src/types";
import type { KeyRule } from "@/src/types";
import { loadSettings, saveSettings } from "@/src/utils/sitecore-settings";
import {
  loadTranslationSettings,
  saveTranslationSettings,
} from "@/src/utils/sitecore-translation-settings";
import {
  loadGeneralSettings,
  saveGeneralSettings,
  type GeneralSettings,
} from "@/src/utils/general-settings";
import {
  querySiteSupportedLanguageIds,
  querySiteLanguage,
} from "@/src/utils/sitecore-graphql";
import { KEY_RULE_OPTIONS } from "@/src/utils/key-rules";
import { isSealedSecret } from "@/src/utils/translation-secrets";
import { LANGUAGE_DISPLAY_NAMES } from "@/src/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/lib/icon";
import { cn } from "@/lib/utils";

// OpenAI logo SVG path
const OPENAI_ICON_PATH = "M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z";

// LibreTranslate logo SVG path
const LIBRETRANSLATE_ICON_PATH = "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7v-2zm0 4h10v2H7v-2zm3-8h4v2h-4V7z";

type Tab = "languages" | "general" | "translations";

/** What each provider receives when the user clicks Translate (shown as the AI disclosure). */
const PROVIDER_DISCLOSURE: Record<TranslationProviderType, string> = {
  libretranslate:
    "Machine translation. The phrase and target languages are sent to the LibreTranslate server you enter below.",
  openai:
    "Generative AI. The phrase, its description, entry name, dictionary key, site name and target languages are sent to OpenAI.",
  anthropic:
    "Generative AI. The phrase, its description, entry name, dictionary key, site name and target languages are sent to Anthropic (Claude).",
  google:
    "Machine translation. The phrase and target languages are sent to Google Cloud Translation.",
  custom:
    "The phrase, its description, dictionary key, site name and target languages are sent to the endpoint you enter below, which may use AI or machine translation.",
};

/**
 * Password field for an API key. A saved key is encrypted and never shown;
 * typing replaces it, Remove clears it.
 */
function SecretInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const saved = isSealedSecret(value);
  return (
    <div className="flex items-center gap-2">
      <Input
        type="password"
        autoComplete="off"
        value={saved ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={saved ? "Saved (encrypted). Type a new key to replace it." : placeholder}
        className={className}
      />
      {saved && (
        <Button variant="ghost" size="sm" type="button" onClick={() => onChange("")}>
          Remove
        </Button>
      )}
    </div>
  );
}

interface SettingsPageProps {
  client: ClientSDK;
  sitecoreContextId: string;
  sites: Site[];
  initialSiteName: string;
  allLanguageItems: LanguageItem[];
  onBack: () => void;
  showToast: (
    title: string,
    description: string,
    options?: { variant?: "default" | "success" | "error" | "warning" }
  ) => void;
}

export function SettingsPage({
  client,
  sitecoreContextId,
  sites,
  initialSiteName,
  allLanguageItems,
  onBack,
  showToast,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("languages");

  // --- Languages Tab ---
  const [langSiteName, setLangSiteName] = useState(initialSiteName);
  const [baseLanguage, setBaseLanguage] = useState(DEFAULT_SETTINGS.baseLanguage);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [siteDefaultLanguages, setSiteDefaultLanguages] = useState<string[]>([]);
  const [langSearch, setLangSearch] = useState("");
  const [isLoadingLang, setIsLoadingLang] = useState(false);
  const [isSavingLang, setIsSavingLang] = useState(false);

  // --- General Tab ---
  const [keyRule, setKeyRule] = useState<KeyRule>(DEFAULT_SETTINGS.keyRule);
  const [disableAutoFormat, setDisableAutoFormat] = useState(DEFAULT_SETTINGS.disableAutoFormat);
  const [disableDeletion, setDisableDeletion] = useState(DEFAULT_SETTINGS.disableDeletion);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // --- Translations Tab ---
  const [translationProvider, setTranslationProvider] = useState<TranslationProviderType>(DEFAULT_TRANSLATION_SETTINGS.provider);
  const [openAIApiKey, setOpenAIApiKey] = useState(DEFAULT_TRANSLATION_SETTINGS.openAIApiKey);
  const [openAIModel, setOpenAIModel] = useState(DEFAULT_TRANSLATION_SETTINGS.openAIModel);
  const [anthropicApiKey, setAnthropicApiKey] = useState(DEFAULT_TRANSLATION_SETTINGS.anthropicApiKey);
  const [anthropicModel, setAnthropicModel] = useState(DEFAULT_TRANSLATION_SETTINGS.anthropicModel);
  const [customUrl, setCustomUrl] = useState(DEFAULT_TRANSLATION_SETTINGS.customUrl);
  const [libreTranslateUrl, setLibreTranslateUrl] = useState(DEFAULT_TRANSLATION_SETTINGS.libreTranslateUrl);
  const [libreTranslateApiKey, setLibreTranslateApiKey] = useState(DEFAULT_TRANSLATION_SETTINGS.libreTranslateApiKey);
  const [googleApiKey, setGoogleApiKey] = useState(DEFAULT_TRANSLATION_SETTINGS.googleApiKey);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [isSavingTranslation, setIsSavingTranslation] = useState(false);
  const [customDocsOpen, setCustomDocsOpen] = useState(false);

  const allLanguageCodes = allLanguageItems.map((l) => l.code);

  // Load general settings from localStorage on mount
  useEffect(() => {
    const general = loadGeneralSettings();
    if (general) {
      setKeyRule(general.keyRule);
      setDisableAutoFormat(general.disableAutoFormat);
      setDisableDeletion(general.disableDeletion);
    }
  }, []);

  // Load site-specific settings whenever the selected Languages-tab site changes
  useEffect(() => {
    if (!client || !sitecoreContextId || !langSiteName || allLanguageItems.length === 0) return;

    const site = sites.find((s) => s.name === langSiteName);
    if (!site) return;

    let cancelled = false;

    async function load() {
      setIsLoadingLang(true);
      try {
        const [siteSettings, supportedIds, siteBaseLang] = await Promise.all([
          loadSettings(client!, sitecoreContextId, langSiteName),
          querySiteSupportedLanguageIds(client!, sitecoreContextId, site!.rootPath),
          querySiteLanguage(client!, sitecoreContextId, langSiteName),
        ]);

        if (cancelled) return;

        let defaultLangs: string[] = [];
        if (supportedIds.length > 0) {
          const normalizedIds = supportedIds.map((id) =>
            id.replace(/[{}]/g, "").toLowerCase()
          );
          defaultLangs = allLanguageItems
            .filter((lang) =>
              normalizedIds.includes(lang.itemId.replace(/[{}]/g, "").toLowerCase())
            )
            .map((lang) => lang.code);
        }

        setSiteDefaultLanguages(defaultLangs);
        setBaseLanguage(siteSettings.baseLanguage || siteBaseLang || "en");

        const effectiveDefaults =
          defaultLangs.length > 0 ? defaultLangs : allLanguageCodes;
        setSelectedLanguages(
          siteSettings.availableLanguages.length > 0
            ? siteSettings.availableLanguages
            : effectiveDefaults
        );
      } catch (e) {
        console.error("Error loading site settings:", e);
      } finally {
        if (!cancelled) setIsLoadingLang(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // allLanguageCodes is derived from allLanguageItems, no need to add separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, sitecoreContextId, langSiteName, sites, allLanguageItems]);

  // Load translation settings on mount
  useEffect(() => {
    if (!client || !sitecoreContextId) return;
    let cancelled = false;
    async function loadTrans() {
      setIsLoadingTranslation(true);
      try {
        const ts = await loadTranslationSettings(client!, sitecoreContextId);
        if (cancelled) return;
        setTranslationProvider(ts.provider);
        setOpenAIApiKey(ts.openAIApiKey);
        setOpenAIModel(ts.openAIModel || DEFAULT_TRANSLATION_SETTINGS.openAIModel);
        setAnthropicApiKey(ts.anthropicApiKey || "");
        setAnthropicModel(ts.anthropicModel || DEFAULT_TRANSLATION_SETTINGS.anthropicModel);
        setCustomUrl(ts.customUrl);
        setLibreTranslateUrl(ts.libreTranslateUrl || "");
        setLibreTranslateApiKey(ts.libreTranslateApiKey || "");
        setGoogleApiKey(ts.googleApiKey || "");
      } catch (e) {
        console.error("Error loading translation settings:", e);
      } finally {
        if (!cancelled) setIsLoadingTranslation(false);
      }
    }
    loadTrans();
    return () => { cancelled = true; };
  }, [client, sitecoreContextId]);

  const filteredLanguages = allLanguageCodes.filter((code) => {
    if (!langSearch.trim()) return true;
    const q = langSearch.toLowerCase();
    const label = LANGUAGE_DISPLAY_NAMES[code] ?? code;
    return label.toLowerCase().includes(q) || code.toLowerCase().includes(q);
  });

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSaveLanguages = async () => {
    setIsSavingLang(true);
    try {
      // Merge with existing saved settings to preserve general fields already in Sitecore
      const current = await loadSettings(client!, sitecoreContextId, langSiteName);
      const updated: DictionarySettings = {
        ...current,
        baseLanguage,
        availableLanguages: selectedLanguages,
      };
      await saveSettings(client!, sitecoreContextId, langSiteName, updated);
      showToast(
        "Languages saved",
        `Language settings for "${langSiteName}" have been updated.`,
        { variant: "success" }
      );
    } catch (e) {
      console.error("Error saving language settings:", e);
      showToast("Error", "Failed to save language settings.", { variant: "error" });
    } finally {
      setIsSavingLang(false);
    }
  };

  const handleSaveGeneral = () => {
    setIsSavingGeneral(true);
    try {
      const general: GeneralSettings = { keyRule, disableAutoFormat, disableDeletion };
      saveGeneralSettings(general);
      showToast("General settings saved", "Your preferences have been updated.", {
        variant: "success",
      });
    } catch (e) {
      console.error("Error saving general settings:", e);
      showToast("Error", "Failed to save general settings.", { variant: "error" });
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSaveTranslation = async () => {
    setIsSavingTranslation(true);
    try {
      const ts: TranslationSettings = {
        provider: translationProvider,
        openAIApiKey,
        openAIModel: openAIModel || DEFAULT_TRANSLATION_SETTINGS.openAIModel,
        anthropicApiKey,
        anthropicModel: anthropicModel.trim() || DEFAULT_TRANSLATION_SETTINGS.anthropicModel,
        customUrl: customUrl.trim(),
        libreTranslateUrl: libreTranslateUrl.trim(),
        libreTranslateApiKey,
        googleApiKey,
      };
      const saved = await saveTranslationSettings(client!, sitecoreContextId, ts);
      // Keys come back encrypted; the inputs switch to "Saved"
      setOpenAIApiKey(saved.openAIApiKey);
      setAnthropicApiKey(saved.anthropicApiKey);
      setLibreTranslateApiKey(saved.libreTranslateApiKey);
      setGoogleApiKey(saved.googleApiKey);
      showToast("Translation settings saved", "Your translation provider has been updated.", {
        variant: "success",
      });
    } catch (e) {
      console.error("Error saving translation settings:", e);
      const detail = e instanceof Error ? ` ${e.message}` : "";
      showToast("Error", `Failed to save translation settings.${detail}`, { variant: "error" });
    } finally {
      setIsSavingTranslation(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "languages", label: "Languages", icon: "translate" },
    { id: "general", label: "General", icon: "tune" },
    { id: "translations", label: "Translations", icon: "g_translate" },
  ];

  return (
    <div className="p-(--spacing-margin-page) min-h-screen bg-surface-bright">
      <div className="max-w-[1280px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back
          </Button>
          <div className="w-px h-5 bg-border-muted" />
          <div>
            <h1 className="text-lg font-bold text-on-surface leading-tight">Settings</h1>
            <p className="text-[11px] text-text-subtle">Configure Dictionary Editor preferences</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-0 border-b border-border-muted -mb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-subtle hover:text-on-surface hover:border-border-muted"
              )}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-border-muted rounded-xl p-6">

          {/* ── Languages Tab ── */}
          {activeTab === "languages" && (
            <div className="space-y-6">

              <div className="flex gap-6 items-start">
                {/* Site Vertical Tabs */}
                <div className="shrink-0 w-[200px]">
                  <p className="text-xs font-bold text-text-subtle mb-2 uppercase tracking-wider">Site</p>
                  <div className="flex flex-col">
                    {sites.map((site) => (
                      <button
                        key={site.name}
                        onClick={() => setLangSiteName(site.name)}
                        className={cn(
                          "text-left px-3 py-2 rounded-lg text-sm transition-colors",
                          langSiteName === site.name
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-on-surface hover:bg-surface-grey"
                        )}
                      >
                        {site.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-px self-stretch bg-border-muted" />

                {/* Site Configuration */}
                <div className="flex-1 min-w-0">
                  {isLoadingLang ? (
                    <div className="flex items-center gap-2 text-text-subtle text-sm py-4">
                      <span className="material-symbols-outlined text-[20px] animate-spin">
                        progress_activity
                      </span>
                      Loading site settings…
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Base Language */}
                      <div>
                        <label className="text-xs font-bold text-text-subtle block mb-1.5 uppercase tracking-wider">
                          Base Language
                        </label>
                        <div className="relative max-w-[300px]">
                          <select
                            value={baseLanguage}
                            onChange={(e) => setBaseLanguage(e.target.value)}
                            className="w-full appearance-none bg-white border border-border-muted px-4 py-2.5 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                          >
                            {allLanguageCodes.map((code) => (
                              <option key={code} value={code}>
                                {LANGUAGE_DISPLAY_NAMES[code] ?? code}
                              </option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-subtle text-[18px]">
                            expand_more
                          </span>
                        </div>
                        <p className="text-[11px] text-text-subtle mt-1.5">
                          The primary language used to determine missing translations.
                        </p>
                      </div>

                      {/* Available Languages */}
                      {allLanguageCodes.length > 0 && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-bold text-text-subtle block mb-1 uppercase tracking-wider">
                              Available Languages
                            </label>
                            <p className="text-[11px] text-text-subtle">
                              Select which languages appear in the Display Phrase dropdown.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              value={langSearch}
                              onChange={(e) => setLangSearch(e.target.value)}
                              placeholder="Filter languages…"
                              className="max-w-[220px] h-8 text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-8"
                              onClick={() =>
                                setSelectedLanguages(
                                  selectedLanguages.length === allLanguageCodes.length
                                    ? []
                                    : [...allLanguageCodes]
                                )
                              }
                            >
                              {selectedLanguages.length === allLanguageCodes.length
                                ? "Deselect All"
                                : "Select All"}
                            </Button>
                            {siteDefaultLanguages.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8"
                                onClick={() => setSelectedLanguages([...siteDefaultLanguages])}
                              >
                                Reset to Site Defaults
                              </Button>
                            )}
                          </div>
                          <div className="border border-border-muted rounded-lg max-h-[280px] overflow-y-auto w-[300px]">
                            {filteredLanguages.map((code) => (
                              <label
                                key={code}
                                className="flex items-center gap-3 px-3 py-1.5 hover:bg-surface-container-low cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedLanguages.includes(code)}
                                  onCheckedChange={() => toggleLanguage(code)}
                                />
                                <span className="text-sm text-on-surface">
                                  {LANGUAGE_DISPLAY_NAMES[code] ?? code}
                                </span>
                                <span className="text-xs text-text-subtle font-mono ml-auto">
                                  {code}
                                </span>
                              </label>
                            ))}
                            {filteredLanguages.length === 0 && (
                              <p className="px-3 py-4 text-xs text-text-subtle text-center">
                                No languages match your filter.
                              </p>
                            )}
                          </div>
                          <p className="text-[11px] text-text-subtle">
                            {selectedLanguages.length} of {allLanguageCodes.length} languages selected
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center pt-2 border-t border-border-muted">
                <Button onClick={handleSaveLanguages} disabled={isSavingLang}>
                  {isSavingLang ? "Saving…" : "Save Language Settings"}
                </Button>
              </div>
            </div>
          )}

          {/* ── General Tab ── */}
          {activeTab === "general" && (
            <div className="space-y-6">

              <div className="grid grid-cols-2 gap-6">
                {/* Key Rules */}
                <div>
                  <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">key</span>
                    Key Rules
                  </h3>
                  <div className="space-y-4 pl-6">
                    <div>
                      <label className="text-xs font-bold text-text-subtle block mb-1.5">
                        Key Format
                      </label>
                      <select
                        value={keyRule}
                        onChange={(e) => setKeyRule(e.target.value as KeyRule)}
                        className="w-full max-w-[360px] bg-white border border-border-muted px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        {KEY_RULE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} — {opt.example}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-text-subtle mt-1.5">
                        How the Key field is auto-derived from the Name when adding entries.
                      </p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={disableAutoFormat}
                        onCheckedChange={(val) => setDisableAutoFormat(val === true)}
                      />
                      <div>
                        <span className="text-sm font-medium text-on-surface">
                          Disable Auto-Format
                        </span>
                        <p className="text-[11px] text-text-subtle">
                          Key field won&apos;t auto-fill when typing the entry name.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Disable Deletion */}
                <div>
                  <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                    Deletion
                  </h3>
                  <div className="pl-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={disableDeletion}
                        onCheckedChange={(val) => setDisableDeletion(val === true)}
                      />
                      <div>
                        <span className="text-sm font-medium text-on-surface">
                          Disable Deletion
                        </span>
                        <p className="text-[11px] text-text-subtle">
                          Hides the delete column from the entry table.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-2 border-t border-border-muted">
                <Button onClick={handleSaveGeneral} disabled={isSavingGeneral}>
                  {isSavingGeneral ? "Saving…" : "Save General Settings"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Translations Tab ── */}
          {activeTab === "translations" && (
            <div className="space-y-6">

              {/* Info Box */}
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5 shrink-0">shield</span>
                <p className="text-[12px] text-blue-800 leading-relaxed">
                  All configuration, including API keys, is stored securely in your SitecoreAI database. Credentials are never shared with any third party beyond the translation provider you configure.
                </p>
              </div>

              {isLoadingTranslation ? (
                <div className="flex items-center justify-center gap-2 text-text-subtle text-sm py-12">
                  <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  Loading translation settings…
                </div>
              ) : (
                <>
                  <div className="flex gap-6 items-start">
                    {/* Provider Selector */}
                    <div className="shrink-0 w-[260px]">
                      <label className="text-xs font-bold text-text-subtle block mb-2 uppercase tracking-wider">
                        Translation Provider
                      </label>
                      <div className="flex flex-col gap-2">
                        {([
                          { id: "libretranslate" as TranslationProviderType, label: "LibreTranslate", icon: "libretranslate", description: "Open-source machine translation on a server you choose." },
                          { id: "openai" as TranslationProviderType, label: "OpenAI", icon: "openai", description: "Use OpenAI models to translate phrases automatically." },
                          { id: "anthropic" as TranslationProviderType, label: "Anthropic", icon: "auto_awesome", description: "Use Claude models to translate phrases automatically." },
                          { id: "google" as TranslationProviderType, label: "Google Translate", icon: "g_translate", description: "Use Google Cloud Translation API v2 for machine translation." },
                          { id: "custom" as TranslationProviderType, label: "Custom Endpoint", icon: "webhook", description: "Send translation requests to your own API endpoint." },
                        ] as const).map((p) => {
                          const selected = translationProvider === p.id;
                          return (
                            <label
                              key={p.id}
                              className={cn(
                                "flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                                selected
                                  ? "border-primary bg-[#f7f6ff]"
                                  : "border-border-muted bg-white hover:border-primary/40 hover:bg-surface-grey"
                              )}
                            >
                              <input
                                type="radio"
                                name="translationProvider"
                                value={p.id}
                                checked={selected}
                                onChange={() => setTranslationProvider(p.id)}
                                className="accent-primary w-4 h-4 shrink-0"
                              />
                              {p.icon === "openai" ? (
                                <Icon 
                                  path={OPENAI_ICON_PATH} 
                                  size={0.833} 
                                  className={cn("shrink-0", selected ? "text-primary" : "text-text-subtle")}
                                />
                              ) : p.icon === "libretranslate" ? (
                                <Icon 
                                  path={LIBRETRANSLATE_ICON_PATH} 
                                  size={0.833} 
                                  className={cn("shrink-0", selected ? "text-primary" : "text-text-subtle")}
                                />
                              ) : (
                                <span className={cn("material-symbols-outlined text-[20px] shrink-0", selected ? "text-primary" : "text-text-subtle")}>
                                  {p.icon}
                                </span>
                              )}
                              <div>
                                <span className={cn("text-sm font-semibold", selected ? "text-primary" : "text-on-surface")}>
                                  {p.label}
                                </span>
                                <p className="text-[11px] text-text-subtle mt-0.5">{p.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="w-px self-stretch bg-border-muted" />

                    {/* Configuration Panel */}
                    <div className="flex-1 min-w-0">
                      {/* AI / machine translation disclosure */}
                      <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5 shrink-0">smart_toy</span>
                        <div className="text-[11px] text-amber-900 leading-relaxed">
                          <p className="font-semibold mb-1">AI and machine translation</p>
                          <p className="mb-1">
                            {PROVIDER_DISCLOSURE[translationProvider]} Data is sent only when you click Translate, from this app&apos;s server, and is handled under that provider&apos;s terms.
                          </p>
                          <p>Translations are generated automatically and can be wrong. Review every translation before you save it.</p>
                        </div>
                      </div>

                      {/* OpenAI Fields */}
                      {translationProvider === "openai" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                            <Icon path={OPENAI_ICON_PATH} size={0.75} />
                            OpenAI Configuration
                          </h3>
                          <div className="space-y-4 pl-6">
                            <div>
                              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                                API Key
                              </label>
                              <SecretInput
                                value={openAIApiKey}
                                onChange={setOpenAIApiKey}
                                placeholder="sk-..."
                                className="max-w-[420px] font-mono text-xs"
                              />
                              <p className="text-[11px] text-text-subtle mt-1.5">
                                Your OpenAI secret key. Encrypted before it is stored in SitecoreAI and sent only to OpenAI.
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                                Model
                              </label>
                              <Input
                                type="text"
                                value={openAIModel}
                                onChange={(e) => setOpenAIModel(e.target.value)}
                                placeholder="gpt-5-nano"
                                className="max-w-[240px] font-mono text-xs"
                              />
                              <p className="text-[11px] text-text-subtle mt-1.5">
                                The model to use for translations. Default: <code className="bg-surface-grey px-1 rounded">gpt-5-nano</code>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Anthropic Fields */}
                      {translationProvider === "anthropic" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                            Anthropic Configuration
                          </h3>
                          <div className="space-y-4 pl-6">
                            <div>
                              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                                API Key
                              </label>
                              <SecretInput
                                value={anthropicApiKey}
                                onChange={setAnthropicApiKey}
                                placeholder="sk-ant-..."
                                className="max-w-[420px] font-mono text-xs"
                              />
                              <p className="text-[11px] text-text-subtle mt-1.5">
                                Your Anthropic API key from the Claude Console. Encrypted before it is stored in SitecoreAI and sent only to Anthropic.
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                                Model
                              </label>
                              <Input
                                type="text"
                                value={anthropicModel}
                                onChange={(e) => setAnthropicModel(e.target.value)}
                                placeholder="claude-opus-5-5"
                                className="max-w-[240px] font-mono text-xs"
                              />
                              <p className="text-[11px] text-text-subtle mt-1.5">
                                The model to use for translations. Default: <code className="bg-surface-grey px-1 rounded">claude-opus-5-5</code>. For lower cost, try <code className="bg-surface-grey px-1 rounded">claude-sonnet-5-5</code> or <code className="bg-surface-grey px-1 rounded">claude-haiku-5-5</code>.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Custom Fields */}
                      {translationProvider === "custom" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">webhook</span>
                            Custom Endpoint Configuration
                          </h3>
                          <div className="space-y-4 pl-6">
                            <div>
                              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                                Webhook URL
                              </label>
                              <Input
                                type="url"
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                                placeholder="https://your-endpoint.com/translate"
                                className="max-w-[420px] text-sm"
                              />
                              <p className="text-[11px] text-text-subtle mt-1.5">
                                The application will POST translation requests to this URL. It must be a public http(s) address on port 80 or 443; redirects are not followed.
                              </p>
                            </div>

                            {/* Collapsible Docs */}
                            <div className="border border-border-muted rounded-lg overflow-hidden">
                              <button
                                onClick={() => setCustomDocsOpen((v) => !v)}
                                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-text-subtle hover:bg-surface-grey transition-colors"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[15px]">code</span>
                                  Request &amp; Response Format
                                </span>
                                <span className={cn("material-symbols-outlined text-[16px] transition-transform", customDocsOpen && "rotate-180")}>
                                  expand_more
                                </span>
                              </button>
                              {customDocsOpen && (
                                <div className="border-t border-border-muted px-4 py-4 space-y-4 bg-surface-bright text-[11px]">
                                  <div>
                                    <p className="font-bold text-text-subtle mb-1.5 uppercase tracking-wider">POST Request Body</p>
                                    <pre className="bg-[#1e1e2e] text-green-300 rounded-lg p-3 overflow-x-auto leading-relaxed text-[10.5px]">{`{
  "siteName": "my-site",
  "dictionaryName": "Dictionary",
  "key": "homepage.welcome",
  "phrase": "Welcome to our website",
  "baseLanguage": "en",
  "description": "Greeting shown on the homepage hero",
  "targetLanguages": ["fr-FR", "de-DE", "es-ES"]
}`}</pre>
                                  </div>
                                  <div>
                                    <p className="font-bold text-text-subtle mb-1.5 uppercase tracking-wider">Expected Response</p>
                                    <pre className="bg-[#1e1e2e] text-green-300 rounded-lg p-3 overflow-x-auto leading-relaxed text-[10.5px]">{`[
  { "languageCode": "fr-FR", "translation": "Bienvenue sur notre site" },
  { "languageCode": "de-DE", "translation": "Willkommen auf unserer Website" },
  { "languageCode": "es-ES", "translation": "Bienvenido a nuestro sitio web" }
]`}</pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* LibreTranslate Fields */}
                      {translationProvider === "libretranslate" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                            <Icon path={LIBRETRANSLATE_ICON_PATH} size={0.75} />
                            LibreTranslate Configuration
                          </h3>
                          <div className="space-y-4 pl-6">
                            <div>
                              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                                Server URL
                              </label>
                              <Input
                                type="url"
                                value={libreTranslateUrl}
                                onChange={(e) => setLibreTranslateUrl(e.target.value)}
                                placeholder="https://libretranslate.example.com"
                                className="max-w-[420px] text-sm"
                              />
                              <p className="text-[11px] text-text-subtle mt-1.5">
                                The LibreTranslate instance to use for translations. It must be a public http(s) address on port 80 or 443.
                              </p>
                              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                                <span className="material-symbols-outlined text-[16px] text-blue-600 mt-0.5 shrink-0">info</span>
                                <div className="text-[11px] text-blue-800 leading-relaxed">
                                  <p className="mb-1.5">
                                    <strong>LibreTranslate is free and open-source</strong> for self-hosting. There is no default server: phrases go only to the server you enter here, so choose one you trust.
                                  </p>
                                  <p>
                                    Want to self-host? Visit{" "}
                                    <a 
                                      href="https://libretranslate.com" 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-700 underline hover:text-blue-900 font-semibold"
                                    >
                                      libretranslate.com
                                    </a>
                                    {" "}for installation instructions.
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                                API Key
                              </label>
                              <SecretInput
                                value={libreTranslateApiKey}
                                onChange={setLibreTranslateApiKey}
                                className="max-w-[420px] font-mono text-xs"
                              />
                              <p className="text-[11px] text-text-subtle mt-1.5">
                                Optional. Only required if the server enforces API key authentication.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Google Translate Fields */}
                      {translationProvider === "google" && (
                        <div className="space-y-4">
                          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">g_translate</span>
                            Google Translate Configuration
                          </h3>
                          <div className="space-y-4 pl-6">
                            <div>
                              <label className="text-xs font-bold text-text-subtle block mb-1.5">
                                Google Cloud Translation API v2 Key
                              </label>
                              <SecretInput
                                value={googleApiKey}
                                onChange={setGoogleApiKey}
                                placeholder="AIza..."
                                className="max-w-[420px] font-mono text-xs"
                              />
                              <p className="text-[11px] text-text-subtle mt-1.5">
                                Your Google Cloud API key. Encrypted before it is stored in SitecoreAI and sent only to Google.
                              </p>
                            </div>
                            <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                              <span className="material-symbols-outlined text-[16px] text-blue-600 mt-0.5 shrink-0">info</span>
                              <div className="text-[11px] text-blue-800 leading-relaxed">
                                <p className="font-semibold mb-1.5">Setup Instructions:</p>
                                <ol className="list-decimal ml-4 space-y-1">
                                  <li>Enable Google Cloud Translation API v2 in your project</li>
                                  <li>Create an API key with Translation API access</li>
                                  <li>Paste the API key above</li>
                                </ol>
                                <p className="mt-2">
                                  This integration uses the v2 API which only requires an API key (no service account needed).
                                </p>
                              </div>
                            </div>
                            <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                              <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5 shrink-0">help</span>
                              <div className="text-[11px] text-amber-900 leading-relaxed">
                                <p className="font-semibold mb-1">Need v3 API?</p>
                                <p>
                                  If you need Google Cloud Translation API v3 features (service account authentication, glossaries, batch translation), use the <strong>Custom Endpoint</strong> provider instead and point it to your own webhook that handles v3 authentication.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center pt-2 border-t border-border-muted">
                    <Button onClick={handleSaveTranslation} disabled={isSavingTranslation}>
                      {isSavingTranslation ? "Saving…" : "Save Translation Settings"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        <p className="text-left text-[10px] text-text-subtle">
          Developed by Roberto Barbedo
        </p>
      </div>
    </div>
  );
}
