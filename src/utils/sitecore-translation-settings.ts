import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import {
  MODULES_PARENT_ID,
  MODULE_FOLDER_TEMPLATE_ID,
  SETTINGS_ITEM_TEMPLATE_ID,
  MARKETPLACE_FOLDER_PATH,
  MARKETPLACE_FOLDER_NAME,
  MODULE_FOLDER_PATH,
  MODULE_NAME,
  getTranslationSettingsPath,
  getLegacyTranslationSettingsPath,
  type Language,
  DEFAULT_LANGUAGE,
} from "@/src/constants";
import {
  type TranslationSettings,
  DEFAULT_TRANSLATION_SETTINGS,
  TRANSLATION_PROVIDERS,
} from "@/src/types";
import {
  queryItemByPath,
  createItem,
  updateItemFieldByPath,
} from "./sitecore-graphql";
import { sealTranslationSecrets } from "./translation-secrets";

/** Reads and parses the translation settings item at `path`; null if absent/unparsable. */
async function readTranslationSettingsItem(
  client: ClientSDK,
  sitecoreContextId: string,
  path: string,
  language: Language
): Promise<TranslationSettings | null> {
  const settingsItem = await queryItemByPath(
    client,
    sitecoreContextId,
    path,
    language
  );

  const valueField = settingsItem?.fields?.nodes?.find(
    (f) => f.name === "Value"
  );
  if (!valueField?.value) return null;

  try {
    return normalizeTranslationSettings(JSON.parse(valueField.value));
  } catch {
    return null;
  }
}

/**
 * Keeps only known fields, so settings from removed providers (LibreTranslate,
 * including its stored key) are dropped and not written back on the next save.
 */
function normalizeTranslationSettings(stored: Partial<TranslationSettings>): TranslationSettings {
  const settings = { ...DEFAULT_TRANSLATION_SETTINGS };
  for (const field of Object.keys(settings) as (keyof TranslationSettings)[]) {
    const value = stored?.[field];
    if (typeof value === "string") (settings as Record<string, string>)[field] = value;
  }
  if (!(TRANSLATION_PROVIDERS as readonly string[]).includes(settings.provider)) {
    settings.provider = DEFAULT_TRANSLATION_SETTINGS.provider;
  }
  return settings;
}

export async function loadTranslationSettings(
  client: ClientSDK,
  sitecoreContextId: string,
  language: Language = DEFAULT_LANGUAGE
): Promise<TranslationSettings> {
  try {
    // Settings moved under /sitecore/system/Modules/Marketplace; fall back to
    // the legacy location so existing installs keep their settings. The next
    // save writes to the new path.
    return (
      (await readTranslationSettingsItem(
        client,
        sitecoreContextId,
        getTranslationSettingsPath(),
        language
      )) ??
      (await readTranslationSettingsItem(
        client,
        sitecoreContextId,
        getLegacyTranslationSettingsPath(),
        language
      )) ?? { ...DEFAULT_TRANSLATION_SETTINGS }
    );
  } catch (error) {
    console.error("Error loading translation settings:", error);
    return DEFAULT_TRANSLATION_SETTINGS;
  }
}

export async function saveTranslationSettings(
  client: ClientSDK,
  sitecoreContextId: string,
  settings: TranslationSettings,
  language: Language = DEFAULT_LANGUAGE
): Promise<TranslationSettings> {
  try {
    const settingsPath = getTranslationSettingsPath();

    // 1. Ensure the Marketplace folder exists
    let marketplaceFolderItem = await queryItemByPath(
      client,
      sitecoreContextId,
      MARKETPLACE_FOLDER_PATH,
      language
    );

    if (!marketplaceFolderItem) {
      marketplaceFolderItem = await createItem(
        client,
        sitecoreContextId,
        MODULES_PARENT_ID,
        MODULE_FOLDER_TEMPLATE_ID,
        MARKETPLACE_FOLDER_NAME,
        language
      );

      if (!marketplaceFolderItem) {
        throw new Error("Failed to create Marketplace folder");
      }
    }

    // 2. Ensure the root DictionaryEditor module folder exists
    let moduleFolderItem = await queryItemByPath(
      client,
      sitecoreContextId,
      MODULE_FOLDER_PATH,
      language
    );

    if (!moduleFolderItem) {
      moduleFolderItem = await createItem(
        client,
        sitecoreContextId,
        marketplaceFolderItem.itemId,
        MODULE_FOLDER_TEMPLATE_ID,
        MODULE_NAME,
        language
      );

      if (!moduleFolderItem) {
        throw new Error("Failed to create DictionaryEditor module folder");
      }
    }

    // 3. Ensure the global TranslationSettings item exists directly under the module folder
    let settingsItem = await queryItemByPath(
      client,
      sitecoreContextId,
      settingsPath,
      language
    );

    if (!settingsItem) {
      settingsItem = await createItem(
        client,
        sitecoreContextId,
        moduleFolderItem.itemId,
        SETTINGS_ITEM_TEMPLATE_ID,
        "TranslationSettings",
        language
      );

      if (!settingsItem) {
        throw new Error("Failed to create TranslationSettings item");
      }
    }

    // API keys are encrypted by the server before they reach the item
    const sealedSettings = await sealTranslationSecrets(settings);
    const settingsJson = JSON.stringify(sealedSettings);
    await updateItemFieldByPath(
      client,
      sitecoreContextId,
      settingsPath,
      "Value",
      settingsJson,
      language
    );
    return sealedSettings;
  } catch (error) {
    console.error("Error saving translation settings:", error);
    throw error;
  }
}
