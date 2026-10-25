import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import {
  MODULES_PARENT_ID,
  MODULE_FOLDER_TEMPLATE_ID,
  SETTINGS_ITEM_TEMPLATE_ID,
  MARKETPLACE_FOLDER_PATH,
  MARKETPLACE_FOLDER_NAME,
  MODULE_FOLDER_PATH,
  getSiteFolderPath,
  getSiteSettingsPath,
  getLegacySiteSettingsPath,
  MODULE_NAME,
  type Language,
  DEFAULT_LANGUAGE,
} from "@/src/constants";
import { type DictionarySettings, DEFAULT_SETTINGS } from "@/src/types";
import {
  queryItemByPath,
  createItem,
  updateItemFieldByPath,
} from "./sitecore-graphql";

/** Reads and parses the settings item at `path`; null if absent/unparsable. */
async function readSettingsItem(
  client: ClientSDK,
  sitecoreContextId: string,
  path: string,
  language: Language
): Promise<DictionarySettings | null> {
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
    return { ...DEFAULT_SETTINGS, ...JSON.parse(valueField.value) };
  } catch {
    return null;
  }
}

export async function loadSettings(
  client: ClientSDK,
  sitecoreContextId: string,
  siteName: string,
  language: Language = DEFAULT_LANGUAGE
): Promise<DictionarySettings> {
  try {
    // Settings moved under /sitecore/system/Modules/Marketplace; fall back to
    // the legacy location so existing installs keep their settings. The next
    // save writes to the new path.
    return (
      (await readSettingsItem(
        client,
        sitecoreContextId,
        getSiteSettingsPath(siteName),
        language
      )) ??
      (await readSettingsItem(
        client,
        sitecoreContextId,
        getLegacySiteSettingsPath(siteName),
        language
      )) ?? { ...DEFAULT_SETTINGS }
    );
  } catch (error) {
    console.error("Error loading dictionary settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(
  client: ClientSDK,
  sitecoreContextId: string,
  siteName: string,
  settings: DictionarySettings,
  language: Language = DEFAULT_LANGUAGE
): Promise<void> {
  try {
    const siteFolderPath = getSiteFolderPath(siteName);
    const settingsPath = getSiteSettingsPath(siteName);

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

    // 3. Ensure the per-site subfolder exists
    let siteFolderItem = await queryItemByPath(
      client,
      sitecoreContextId,
      siteFolderPath,
      language
    );

    if (!siteFolderItem) {
      siteFolderItem = await createItem(
        client,
        sitecoreContextId,
        moduleFolderItem.itemId,
        MODULE_FOLDER_TEMPLATE_ID,
        siteName,
        language
      );

      if (!siteFolderItem) {
        throw new Error(`Failed to create site folder for "${siteName}"`);
      }
    }

    // 4. Ensure the Settings item exists under the site folder
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
        siteFolderItem.itemId,
        SETTINGS_ITEM_TEMPLATE_ID,
        "Settings",
        language
      );

      if (!settingsItem) {
        throw new Error("Failed to create Settings item");
      }
    }

    const settingsJson = JSON.stringify(settings);
    await updateItemFieldByPath(
      client,
      sitecoreContextId,
      settingsPath,
      "Value",
      settingsJson,
      language
    );
  } catch (error) {
    console.error("Error saving dictionary settings:", error);
    throw error;
  }
}
