"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useMarketplaceClient } from "@/src/utils/hooks/useMarketplaceClient";
import { MarketplaceAuthProvider } from "@/src/lib/marketplace-auth/AuthProvider";
import {
  getSitecoreContextId,
  querySites,
  queryAllLanguages,
  querySiteSupportedLanguageIds,
  querySiteLanguage,
  queryItemChildren,
  queryDictionaryEntries,
  searchDictionaryEntries,
  queryItemsByIds,
  fetchAllDictionaryEntries,
} from "@/src/utils/sitecore-graphql";
import { loadSettings } from "@/src/utils/sitecore-settings";
import { loadGeneralSettings } from "@/src/utils/general-settings";
import { loadTranslationSettings, saveTranslationSettings } from "@/src/utils/sitecore-translation-settings";
import { hasPlaintextSecrets } from "@/src/utils/translation-secrets";
import { DEFAULT_LANGUAGE, DEFAULT_PAGE_SIZE } from "@/src/constants";
import type { Site, DictionaryFolder, DictionaryEntry, DictionarySettings, SitecoreItem, LanguageItem, TranslationSettings } from "@/src/types";
import { DEFAULT_SETTINGS, DEFAULT_TRANSLATION_SETTINGS } from "@/src/types";
import { SiteSelector } from "@/components/site-selector";
import { FolderNavigation } from "@/components/folder-navigation";
import { EntryTable } from "@/components/entry-table";
import { EntryEditor } from "@/components/entry-editor";
import { SearchBar } from "@/components/search-bar";
import { LanguageSelector } from "@/components/language-selector";
import { FindMissingTranslationsButton } from "@/components/missing-translation-filter";
import { AddEntryDialog } from "@/components/add-entry-dialog";
import { PublishDialog } from "@/components/publish-dialog";
import { SettingsPage } from "@/components/settings-page";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Button } from "@/components/ui/button";
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import type { ApplicationContext, ClientSDK } from "@sitecore-marketplace-sdk/client";

function getFieldValue(item: SitecoreItem, fieldName: string): string {
  return item.fields?.nodes?.find((f) => f.name === fieldName)?.value ?? "";
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

/**
 * Signs the user in for the /api/translate routes. The provider reads
 * `window`, so it only mounts in the browser, never during prerendering.
 * Non-blocking: the dictionary works right away; only translate calls wait.
 */
function AuthBoundary({ appContext, children }: { appContext?: ApplicationContext; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{children}</>;
  return (
    <MarketplaceAuthProvider appContext={appContext} blocking={false}>
      {children}
    </MarketplaceAuthProvider>
  );
}

export default function DictionaryEditorPage() {
  const { client } = useMarketplaceClient();

  const [appContext, setAppContext] = useState<ApplicationContext>();
  const withAuth = (view: ReactNode) => <AuthBoundary appContext={appContext}>{view}</AuthBoundary>;

  const [sitecoreContextId, setSitecoreContextId] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [settings, setSettings] = useState<DictionarySettings>(DEFAULT_SETTINGS);

  const [folders, setFolders] = useState<DictionaryFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("All");
  const [dictionaryRootPath, setDictionaryRootPath] = useState("");
  const [dictionaryRootId, setDictionaryRootId] = useState("");

  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [displayLanguage, setDisplayLanguage] = useState(DEFAULT_LANGUAGE);
  const [allLanguageItems, setAllLanguageItems] = useState<LanguageItem[]>([]);
  const [siteDefaultLanguages, setSiteDefaultLanguages] = useState<string[]>([]);
  const [siteDefaultBaseLanguage, setSiteDefaultBaseLanguage] = useState(DEFAULT_LANGUAGE);
  const [siteLanguages, setSiteLanguages] = useState<string[]>([DEFAULT_LANGUAGE]);
  const [missingTranslationMode, setMissingTranslationMode] = useState(false);
  const [allMissingEntries, setAllMissingEntries] = useState<DictionaryEntry[]>([]);
  const [isFindingMissing, setIsFindingMissing] = useState(false);
  const [showLanguageHint, setShowLanguageHint] = useState(false);

  const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<DictionaryEntry | null>(null);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description: string;
    variant?: "default" | "success" | "error" | "warning";
    link?: string;
    duration?: number;
  }>({ title: "", description: "" });

  const [translationSettings, setTranslationSettings] = useState<TranslationSettings>(DEFAULT_TRANSLATION_SETTINGS);

  // Used to force re-fetch entries
  const [refreshKey, setRefreshKey] = useState(0);
  // Used to force re-fetch folders (e.g. after a new folder is created with an entry)
  const [foldersRefreshKey, setFoldersRefreshKey] = useState(0);
  // Used to force re-load settings after returning from the Settings page
  const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);

  const showToast = useCallback(
    (
      title: string,
      description: string,
      options?: { variant?: "default" | "success" | "error" | "warning"; link?: string; duration?: number }
    ) => {
      setToastMessage({ title, description, ...options });
      setToastOpen(true);
    },
    []
  );

  // Initialize SDK context, load sites and all languages
  useEffect(() => {
    if (!client) return;

    async function init(c: ClientSDK) {
      c.query("application.context")
        .then((res) => setAppContext(res.data))
        .catch((e) => console.error("Error retrieving application.context:", e));

      try {
        const contextId = await getSitecoreContextId(c);
        setSitecoreContextId(contextId);

        const [sitesData, languageItems, translationConfig] = await Promise.all([
          querySites(c, contextId),
          queryAllLanguages(c, contextId),
          loadTranslationSettings(c, contextId),
        ]);

        setSites(sitesData);
        setAllLanguageItems(languageItems);
        setTranslationSettings(translationConfig);

        const savedSite = getCookie("dictionary_selected_site");
        const site =
          sitesData.find((s) => s.name === savedSite) || sitesData[0] || null;
        if (site) {
          setSelectedSite(site);
        }
      } catch (e) {
        console.error("Initialization error:", e);
      } finally {
        setIsLoading(false);
      }
    }

    init(client);
  }, [client]);

  // Load settings whenever the selected site changes (or after returning from Settings page)
  useEffect(() => {
    if (!client || !sitecoreContextId || !selectedSite) return;

    async function loadSiteSettings() {
      try {
        const [siteSettings, translationConfig] = await Promise.all([
          loadSettings(client!, sitecoreContextId, selectedSite!.name),
          loadTranslationSettings(client!, sitecoreContextId),
        ]);
        const generalSettings = loadGeneralSettings();
        const merged = generalSettings
          ? { ...siteSettings, ...generalSettings }
          : siteSettings;
        setSettings(merged);
        setDisplayLanguage(merged.baseLanguage || DEFAULT_LANGUAGE);
        setTranslationSettings(translationConfig);

        // Settings saved before key encryption hold plaintext API keys;
        // re-saving encrypts them (the translate routes only accept sealed keys)
        if (hasPlaintextSecrets(translationConfig)) {
          saveTranslationSettings(client!, sitecoreContextId, translationConfig)
            .then(setTranslationSettings)
            .catch((e) => console.error("Error encrypting stored API keys:", e));
        }
      } catch (e) {
        console.error("Error loading site settings:", e);
      }
    }

    loadSiteSettings();
  }, [client, sitecoreContextId, selectedSite, settingsRefreshKey]);

  // Load site default languages and base language from Sitecore
  useEffect(() => {
    if (!client || !sitecoreContextId || !selectedSite || allLanguageItems.length === 0) return;

    async function loadSiteDefaults() {
      const [supportedIds, siteBaseLang] = await Promise.all([
        querySiteSupportedLanguageIds(client!, sitecoreContextId, selectedSite!.rootPath),
        querySiteLanguage(client!, sitecoreContextId, selectedSite!.name),
      ]);

      setSiteDefaultBaseLanguage(siteBaseLang);

      if (supportedIds.length > 0) {
        const normalizedIds = supportedIds.map((id) =>
          id.replace(/[{}]/g, "").toLowerCase()
        );
        const resolved = allLanguageItems
          .filter((lang) =>
            normalizedIds.includes(lang.itemId.replace(/[{}]/g, "").toLowerCase())
          )
          .map((lang) => lang.code);
        setSiteDefaultLanguages(resolved);
      } else {
        setSiteDefaultLanguages([]);
      }
    }

    loadSiteDefaults();
  }, [client, sitecoreContextId, selectedSite, allLanguageItems]);

  // Compute effective available languages for the Display Language dropdown
  useEffect(() => {
    const allCodes = allLanguageItems.map((l) => l.code);
    if (allCodes.length === 0) return;

    let effective: string[];
    if (settings.availableLanguages.length > 0) {
      effective = settings.availableLanguages;
    } else if (siteDefaultLanguages.length > 0) {
      effective = siteDefaultLanguages;
    } else {
      effective = allCodes;
    }

    setSiteLanguages(effective);
    setDisplayLanguage((prev) =>
      effective.includes(prev) ? prev : effective[0] ?? DEFAULT_LANGUAGE
    );
  }, [settings.availableLanguages, siteDefaultLanguages, allLanguageItems]);

  // Load folders when site changes
  useEffect(() => {
    if (!client || !sitecoreContextId || !selectedSite) return;

    async function loadFolders() {
      const rootPath = `${selectedSite!.rootPath}/Dictionary`;
      setDictionaryRootPath(rootPath);

      const children = await queryItemChildren(client!, sitecoreContextId, {
        path: rootPath,
      });

      // Find the dictionary root item ID
      const siteChildren = await queryItemChildren(client!, sitecoreContextId, {
        path: selectedSite!.rootPath,
      });
      const dictFolder = siteChildren.find((c) => c.name === "Dictionary");
      if (dictFolder) {
        setDictionaryRootId(dictFolder.itemId);
      }

      const foldersList: DictionaryFolder[] = children.map((child) => ({
        itemId: child.itemId,
        name: child.name,
        path: child.path,
        hasChildren: child.hasChildren,
      }));

      setFolders(foldersList);
      setSelectedFolder("All");
      setPageIndex(0);
    }

    loadFolders();
  }, [client, sitecoreContextId, selectedSite, foldersRefreshKey]);

  // Load entries when folder, language, search, or page changes
  useEffect(() => {
    if (!client || !sitecoreContextId || !dictionaryRootPath || !dictionaryRootId) return;
    if (missingTranslationMode) return;

    async function loadEntries() {
      setIsLoading(true);
      try {
        let items: SitecoreItem[] = [];
        let total = 0;

        if (searchKeyword.trim()) {
          // Search across all entries by keyword
          const result = await searchDictionaryEntries(
            client!,
            sitecoreContextId,
            dictionaryRootId,
            searchKeyword,
            settings.baseLanguage,
            pageSize,
            pageIndex
          );
          items = result.items;
          total = result.totalCount;
        } else {
          // Query entries in the selected folder (filtered to only Dictionary Entry template)
          const targetPath =
            selectedFolder === "All"
              ? dictionaryRootPath
              : folders.find((f) => f.name === selectedFolder)?.path ||
                dictionaryRootPath;

          const result = await queryDictionaryEntries(
            client!,
            sitecoreContextId,
            targetPath,
            settings.baseLanguage,
            pageSize,
            pageIndex
          );
          items = result.items;
          total = result.totalCount;
        }

        // Map items to DictionaryEntry format
        let mappedEntries: DictionaryEntry[] = items.map((item) => {
          const key = getFieldValue(item, "Key");
          const phrase = getFieldValue(item, "Phrase");
          return {
            itemId: item.itemId,
            name: item.name,
            path: item.path,
            key,
            phrase,
            basePhrase: phrase,
            status: "ok" as const,
          };
        });

        // If display language differs from base, fetch phrases in display language to detect missing translations
        if (displayLanguage !== settings.baseLanguage) {
          const itemIds = mappedEntries.map((e) => e.itemId);
          const displayItems = await queryItemsByIds(
            client!,
            sitecoreContextId,
            itemIds,
            displayLanguage
          );

          const displayMap = new Map(
            displayItems.map((di) => [di.itemId, di])
          );

          mappedEntries = mappedEntries.map((entry) => {
            const displayItem = displayMap.get(entry.itemId);
            const displayPhrase = displayItem
              ? getFieldValue(displayItem, "Phrase")
              : "";
            const isMissing = !displayPhrase;
            return {
              ...entry,
              phrase: displayPhrase,
              basePhrase: entry.basePhrase,
              status: isMissing ? ("missing-translation" as const) : ("ok" as const),
            };
          });
        }

        setEntries(mappedEntries);
        setTotalCount(total);
      } catch (e) {
        console.error("Error loading entries:", e);
      } finally {
        setIsLoading(false);
      }
    }

    loadEntries();
  }, [
    client,
    sitecoreContextId,
    dictionaryRootPath,
    dictionaryRootId,
    selectedFolder,
    displayLanguage,
    searchKeyword,
    missingTranslationMode,
    pageIndex,
    pageSize,
    folders,
    settings.baseLanguage,
    refreshKey,
  ]);

  // Re-slice allMissingEntries when paginating within missing-translation mode
  useEffect(() => {
    if (!missingTranslationMode || allMissingEntries.length === 0) return;
    const start = pageIndex * pageSize;
    setEntries(allMissingEntries.slice(start, start + pageSize));
    setTotalCount(allMissingEntries.length);
  }, [missingTranslationMode, allMissingEntries, pageIndex, pageSize]);

  function exitMissingTranslationMode() {
    setMissingTranslationMode(false);
    setAllMissingEntries([]);
    setPageIndex(0);
  }

  async function handleFindMissingTranslations() {
    if (!client || !sitecoreContextId || !dictionaryRootPath || !dictionaryRootId) return;
    if (displayLanguage === settings.baseLanguage) {
      setShowLanguageHint(true);
      setTimeout(() => setShowLanguageHint(false), 10000);
      return;
    }

    setIsFindingMissing(true);
    setPageIndex(0);

    try {
      const targetPath =
        selectedFolder === "All"
          ? dictionaryRootPath
          : folders.find((f) => f.name === selectedFolder)?.path ?? dictionaryRootPath;

      const allBaseItems = await fetchAllDictionaryEntries(
        client,
        sitecoreContextId,
        {
          folderPath: targetPath,
          language: settings.baseLanguage,
          keyword: searchKeyword.trim() || undefined,
          dictionaryRootId,
        }
      );

      const CHUNK_SIZE = 50;
      const displayItemsFlat: SitecoreItem[] = [];
      for (let i = 0; i < allBaseItems.length; i += CHUNK_SIZE) {
        const chunk = allBaseItems.slice(i, i + CHUNK_SIZE);
        const chunkIds = chunk.map((item) => item.itemId);
        const chunkDisplay = await queryItemsByIds(
          client,
          sitecoreContextId,
          chunkIds,
          displayLanguage
        );
        displayItemsFlat.push(...chunkDisplay);
      }

      const displayMap = new Map(displayItemsFlat.map((di) => [di.itemId, di]));

      const missing: DictionaryEntry[] = allBaseItems
        .map((item) => {
          const key = getFieldValue(item, "Key");
          const basePhrase = getFieldValue(item, "Phrase");
          const displayItem = displayMap.get(item.itemId);
          const displayPhrase = displayItem ? getFieldValue(displayItem, "Phrase") : "";
          return {
            itemId: item.itemId,
            name: item.name,
            path: item.path,
            key,
            phrase: displayPhrase,
            basePhrase,
            status: "missing-translation" as const,
          };
        })
        .filter((e) => !e.phrase);

      setAllMissingEntries(missing);
      setEntries(missing.slice(0, pageSize));
      setTotalCount(missing.length);
      setMissingTranslationMode(true);
    } catch (e) {
      console.error("Error finding missing translations:", e);
    } finally {
      setIsFindingMissing(false);
    }
  }

  const handleSiteChange = (site: Site) => {
    setSelectedSite(site);
    setCookie("dictionary_selected_site", site.name);
    setSearchKeyword("");
    setPageIndex(0);
    exitMissingTranslationMode();
  };

  const handleFolderChange = (folder: string) => {
    setSelectedFolder(folder);
    setSearchKeyword("");
    setPageIndex(0);
    exitMissingTranslationMode();
  };

  const handleSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    if (keyword.trim()) {
      setSelectedFolder("All");
    }
    setPageIndex(0);
    exitMissingTranslationMode();
  };

  const handleEdit = (entry: DictionaryEntry) => {
    setEditingEntry(entry);
  };

  const handleDelete = (entry: DictionaryEntry) => {
    setDeletingEntry(entry);
  };

  const handleEntryDeleted = () => {
    setDeletingEntry(null);
    showToast("Entry deleted", "The dictionary entry has been removed.");
    setRefreshKey((k) => k + 1);
  };

  const handleEntryAdded = (entry: DictionaryEntry) => {
    setShowAddDialog(false);
    setFoldersRefreshKey((k) => k + 1);
    setRefreshKey((k) => k + 1);
    setEditingEntry(entry);
  };

  const handleSettingsBack = () => {
    setShowSettings(false);
    setSettingsRefreshKey((k) => k + 1);
  };

  // Settings page view
  if (showSettings && client && selectedSite) {
    return withAuth(
      <ToastProvider>
        <SettingsPage
          client={client}
          sitecoreContextId={sitecoreContextId}
          sites={sites}
          initialSiteName={selectedSite.name}
          allLanguageItems={allLanguageItems}
          onBack={handleSettingsBack}
          showToast={showToast}
        />
        <Toast open={toastOpen} onOpenChange={setToastOpen} variant={toastMessage.variant} duration={toastMessage.duration ?? 10000}>
          <div className="flex items-start gap-3 w-full">
            <span className="material-symbols-outlined text-[24px] mt-0.5 shrink-0">
              {toastMessage.variant === "error" ? "error" : toastMessage.variant === "success" ? "check_circle" : toastMessage.variant === "warning" ? "warning" : "info"}
            </span>
            <div className="flex-1 min-w-0">
              <ToastTitle>{toastMessage.title}</ToastTitle>
              <ToastDescription>{toastMessage.description}</ToastDescription>
            </div>
          </div>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
  }

  // Editor view
  if (editingEntry) {
    return withAuth(
      <ToastProvider>
        <EntryEditor
          client={client!}
          sitecoreContextId={sitecoreContextId}
          entry={editingEntry}
          baseLanguage={settings.baseLanguage}
          availableLanguages={siteLanguages}
          siteName={selectedSite?.name ?? ""}
          translationSettings={translationSettings}
          onBack={() => {
            setEditingEntry(null);
            setRefreshKey((k) => k + 1);
          }}
          onFolderClick={(folder) => {
            setEditingEntry(null);
            setRefreshKey((k) => k + 1);
            handleFolderChange(folder);
          }}
          showToast={showToast}
        />
        <Toast open={toastOpen} onOpenChange={setToastOpen} variant={toastMessage.variant} duration={toastMessage.duration ?? 10000}>
          <div className="flex items-start gap-3 w-full">
            <span className="material-symbols-outlined text-[24px] mt-0.5 shrink-0">
              {toastMessage.variant === "error" ? "error" : toastMessage.variant === "success" ? "check_circle" : toastMessage.variant === "warning" ? "warning" : "info"}
            </span>
            <div className="flex-1 min-w-0">
              <ToastTitle>{toastMessage.title}</ToastTitle>
              <ToastDescription>
                {toastMessage.description}
              </ToastDescription>
              {toastMessage.link && (
                <a
                  href={toastMessage.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
                >
                  Read more
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                </a>
              )}
            </div>
          </div>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
  }

  // List view
  return withAuth(
    <ToastProvider>
      <main className="p-(--spacing-margin-page) min-h-screen bg-surface-bright">
        <div className="max-w-[1280px] mx-auto space-y-5">
          {/* Line 1: Site Selection & Primary Actions */}
          <div className="flex items-center justify-between">
            <SiteSelector
              sites={sites}
              selectedSite={selectedSite}
              onSelect={handleSiteChange}
              onSettingsClick={() => setShowSettings(true)}
              baseLanguage={siteDefaultBaseLanguage}
            />
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowPublishDialog(true)}>
                <span className="material-symbols-outlined text-[20px]">publish</span>
                Publish
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add Entry
              </Button>
            </div>
          </div>

          {/* Line 2: Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-border-muted p-4 rounded-xl">
            <SearchBar value={searchKeyword} onChange={handleSearch} />
            <div className="flex items-center gap-6">
              <div className="relative">
                {showLanguageHint && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <div className="text-white text-xs font-medium rounded-lg px-3 py-2 whitespace-nowrap shadow-lg" style={{ backgroundColor: "#ba5200" }}>
                      Select a language different from the base language
                      <div className="absolute top-full right-4 border-4 border-transparent" style={{ borderTopColor: "#ba5200" }} />
                    </div>
                  </div>
                )}
                <LanguageSelector
                  value={displayLanguage}
                  languages={siteLanguages}
                  onChange={(lang) => {
                    setDisplayLanguage(lang);
                    setShowLanguageHint(false);
                    exitMissingTranslationMode();
                  }}
                />
              </div>
              <div className="h-6 w-px bg-border-muted" />
              <FindMissingTranslationsButton
                onClick={handleFindMissingTranslations}
                isLoading={isFindingMissing}
                isActive={missingTranslationMode}
                missingCount={allMissingEntries.length}
                onClear={exitMissingTranslationMode}
              />
            </div>
          </div>

          {/* Line 3: Folder Navigation */}
          <FolderNavigation
            folders={folders}
            selectedFolder={selectedFolder}
            onSelect={handleFolderChange}
            disabled={!!searchKeyword.trim()}
          />

          {/* Line 4: Table */}
          <EntryTable
            entries={entries}
            totalCount={totalCount}
            pageIndex={pageIndex}
            pageSize={pageSize}
            isLoading={isLoading}
            disableDeletion={settings.disableDeletion}
            baseLanguage={settings.baseLanguage}
            displayLanguage={displayLanguage}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPageChange={setPageIndex}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageIndex(0);
            }}
          />
        </div>

      </main>

      {/* Dialogs */}
      {showAddDialog && client && (
        <AddEntryDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          client={client}
          sitecoreContextId={sitecoreContextId}
          folders={folders}
          dictionaryRootId={dictionaryRootId}
          settings={settings}
          onEntryAdded={handleEntryAdded}
        />
      )}

      {showPublishDialog && client && (
        <PublishDialog
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
          client={client}
          sitecoreContextId={sitecoreContextId}
          dictionaryRootPath={dictionaryRootPath}
          languages={Array.from(new Set([settings.baseLanguage, ...siteLanguages].filter(Boolean)))}
          showToast={showToast}
        />
      )}


      {deletingEntry && client && (
        <DeleteConfirmationDialog
          open={!!deletingEntry}
          onOpenChange={(open) => !open && setDeletingEntry(null)}
          client={client}
          sitecoreContextId={sitecoreContextId}
          entry={deletingEntry}
          onDeleted={handleEntryDeleted}
        />
      )}

      <Toast open={toastOpen} onOpenChange={setToastOpen} variant={toastMessage.variant} duration={toastMessage.duration ?? 10000}>
        <div className="flex items-start gap-3 w-full">
          <span className="material-symbols-outlined text-[24px] mt-0.5 shrink-0">
            {toastMessage.variant === "error" ? "error" : toastMessage.variant === "success" ? "check_circle" : toastMessage.variant === "warning" ? "warning" : "info"}
          </span>
          <div className="flex-1 min-w-0">
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>
              {toastMessage.description}
            </ToastDescription>
          </div>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
