export const DICTIONARY_FOLDER_TEMPLATE_ID =
  "{267D9AC7-5D85-4E9D-AF89-99AB296CC218}";
export const DICTIONARY_ENTRY_TEMPLATE_ID =
  "{6D1CD897-1936-4A3A-A511-289A94C2A7B1}";

export const MODULES_PARENT_ID = "{08477468-D438-43D4-9D6A-6D84A611971C}";
export const MODULE_FOLDER_TEMPLATE_ID =
  "{A87A00B1-E6DB-45AB-8B54-636FEC3B5523}";
export const SETTINGS_ITEM_TEMPLATE_ID =
  "{D2923FEE-DA4E-49BE-830C-E27764DFA269}";

export const SITECORE_DATABASES = {
  MASTER: "master",
  EXPERIENCE_EDGE: "experienceedge",
} as const;

export const MODULE_NAME = "DictionaryEditor";
export const MARKETPLACE_FOLDER_NAME = "Marketplace";
export const MODULES_PATH = "/sitecore/system/Modules";
export const MARKETPLACE_FOLDER_PATH = `${MODULES_PATH}/${MARKETPLACE_FOLDER_NAME}`;
export const MODULE_FOLDER_PATH = `${MARKETPLACE_FOLDER_PATH}/${MODULE_NAME}`;

/** Module folder location before the move under the Marketplace folder. */
export const LEGACY_MODULE_FOLDER_PATH = `${MODULES_PATH}/${MODULE_NAME}`;

export function getSiteFolderPath(siteName: string): string {
  return `${MODULE_FOLDER_PATH}/${siteName}`;
}

export function getSiteSettingsPath(siteName: string): string {
  return `${MODULE_FOLDER_PATH}/${siteName}/Settings`;
}

export function getLegacySiteSettingsPath(siteName: string): string {
  return `${LEGACY_MODULE_FOLDER_PATH}/${siteName}/Settings`;
}

export function getTranslationSettingsPath(): string {
  return `${MODULE_FOLDER_PATH}/TranslationSettings`;
}

export function getLegacyTranslationSettingsPath(): string {
  return `${LEGACY_MODULE_FOLDER_PATH}/TranslationSettings`;
}

export const DEFAULT_LANGUAGE = "en";

export type Language = string;

export const LANGUAGES_PATH = "/sitecore/system/Languages";

export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  "en": "English",
  "af-ZA": "Afrikaans (South Africa)",
  "sq-AL": "Albanian (Albania)",
  "ar-DZ": "Arabic (Algeria)",
  "ar-BH": "Arabic (Bahrain)",
  "ar-EG": "Arabic (Egypt)",
  "ar-IQ": "Arabic (Iraq)",
  "ar-JO": "Arabic (Jordan)",
  "ar-KW": "Arabic (Kuwait)",
  "ar-LB": "Arabic (Lebanon)",
  "ar-LY": "Arabic (Libya)",
  "ar-MA": "Arabic (Morocco)",
  "ar-OM": "Arabic (Oman)",
  "ar-QA": "Arabic (Qatar)",
  "ar-SA": "Arabic (Saudi Arabia)",
  "ar-SY": "Arabic (Syria)",
  "ar-TN": "Arabic (Tunisia)",
  "ar-AE": "Arabic (United Arab Emirates)",
  "ar-YE": "Arabic (Yemen)",
  "hy-AM": "Armenian (Armenia)",
  "eu-ES": "Basque (Basque)",
  "be-BY": "Belarusian (Belarus)",
  "bg-BG": "Bulgarian (Bulgaria)",
  "ca-ES": "Catalan (Catalan)",
  "zh-CN": "Chinese (Simplified, China)",
  "zh-SG": "Chinese (Simplified, Singapore)",
  "zh-TW": "Chinese (Traditional, Taiwan)",
  "hr-BA": "Croatian (Bosnia & Herzegovina)",
  "hr-HR": "Croatian (Croatia)",
  "cs-CZ": "Czech (Czechia)",
  "da": "Danish",
  "nl-BE": "Dutch (Belgium)",
  "nl-NL": "Dutch (Netherlands)",
  "en-AU": "English (Australia)",
  "en-BZ": "English (Belize)",
  "en-CA": "English (Canada)",
  "en-IE": "English (Ireland)",
  "en-JM": "English (Jamaica)",
  "en-NZ": "English (New Zealand)",
  "en-PH": "English (Philippines)",
  "en-ZA": "English (South Africa)",
  "en-TT": "English (Trinidad & Tobago)",
  "en-GB": "English (United Kingdom)",
  "en-US": "English (United States)",
  "en-ZW": "English (Zimbabwe)",
  "et-EE": "Estonian (Estonia)",
  "fo-FO": "Faroese (Faroe Islands)",
  "fi-FI": "Finnish (Finland)",
  "fr-BE": "French (Belgium)",
  "fr-CA": "French (Canada)",
  "fr-FR": "French (France)",
  "fr-LU": "French (Luxembourg)",
  "fr-MC": "French (Monaco)",
  "fr-CH": "French (Switzerland)",
  "gl-ES": "Galician (Galician)",
  "ka-GE": "Georgian (Georgia)",
  "de-AT": "German (Austria)",
  "de-DE": "German (Germany)",
  "de-LI": "German (Liechtenstein)",
  "de-LU": "German (Luxembourg)",
  "de-CH": "German (Switzerland)",
  "el-GR": "Greek (Greece)",
  "gu-IN": "Gujarati (India)",
  "he-IL": "Hebrew (Israel)",
  "hi-IN": "Hindi (India)",
  "hu-HU": "Hungarian (Hungary)",
  "is-IS": "Icelandic (Iceland)",
  "id-ID": "Indonesian (Indonesia)",
  "xh-ZA": "isiXhosa (South Africa)",
  "zu-ZA": "isiZulu (South Africa)",
  "it-IT": "Italian (Italy)",
  "it-CH": "Italian (Switzerland)",
  "ja-JP": "Japanese (Japan)",
  "kn-IN": "Kannada (India)",
  "kk-KZ": "Kazakh (Kazakhstan)",
  "sw-KE": "Kiswahili (Kenya)",
  "ko-KR": "Korean (Korea)",
  "ky-KG": "Kyrgyz (Kyrgyzstan)",
  "lv-LV": "Latvian (Latvia)",
  "lt-LT": "Lithuanian (Lithuania)",
  "mk-MK": "Macedonian (North Macedonia)",
  "ms-BN": "Malay (Brunei)",
  "ms-MY": "Malay (Malaysia)",
  "mt-MT": "Maltese (Malta)",
  "mi-NZ": "Maori (New Zealand)",
  "mr-IN": "Marathi (India)",
  "mn-MN": "Mongolian (Mongolia)",
  "nb-NO": "Norwegian Bokmål (Norway)",
  "nn-NO": "Norwegian Nynorsk (Norway)",
  "fa-IR": "Persian (Iran)",
  "pl-PL": "Polish (Poland)",
  "pt-BR": "Portuguese (Brazil)",
  "pt-PT": "Portuguese (Portugal)",
  "pa-IN": "Punjabi (India)",
  "ro-RO": "Romanian (Romania)",
  "ru-RU": "Russian (Russia)",
  "se-FI": "Sami, Northern (Finland)",
  "se-NO": "Sami, Northern (Norway)",
  "se-SE": "Sami, Northern (Sweden)",
  "sa-IN": "Sanskrit (India)",
  "tn-ZA": "Setswana (South Africa)",
  "sk-SK": "Slovak (Slovakia)",
  "sl-SI": "Slovenian (Slovenia)",
  "es-AR": "Spanish (Argentina)",
  "es-BO": "Spanish (Bolivia)",
  "es-CL": "Spanish (Chile)",
  "es-CO": "Spanish (Colombia)",
  "es-CR": "Spanish (Costa Rica)",
  "es-DO": "Spanish (Dominican Republic)",
  "es-EC": "Spanish (Ecuador)",
  "es-SV": "Spanish (El Salvador)",
  "es-GT": "Spanish (Guatemala)",
  "es-HN": "Spanish (Honduras)",
  "es-MX": "Spanish (Mexico)",
  "es-NI": "Spanish (Nicaragua)",
  "es-PA": "Spanish (Panama)",
  "es-PY": "Spanish (Paraguay)",
  "es-PE": "Spanish (Peru)",
  "es-PR": "Spanish (Puerto Rico)",
  "es-ES": "Spanish (Spain, International Sort)",
  "es-UY": "Spanish (Uruguay)",
  "es-VE": "Spanish (Venezuela)",
  "sv-FI": "Swedish (Finland)",
  "sv-SE": "Swedish (Sweden)",
  "ta-IN": "Tamil (India)",
  "tt-RU": "Tatar (Russia)",
  "te-IN": "Telugu (India)",
  "th-TH": "Thai (Thailand)",
  "tr-TR": "Turkish (Türkiye)",
  "uk-UA": "Ukrainian (Ukraine)",
  "ur-PK": "Urdu (Pakistan)",
  "vi-VN": "Vietnamese (Vietnam)",
};

export const LETTER_FOLDERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "0-9",
] as const;

export const DEFAULT_PAGE_SIZE = 15;
