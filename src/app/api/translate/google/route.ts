import { NextRequest, NextResponse } from "next/server";
import {
  fetchProvider,
  openApiKey,
  runTranslateRoute,
  validateTranslateInput,
} from "@/src/utils/translate-route";

interface GoogleTranslateRequestBody {
  /** Sealed by /api/translate/seal */
  googleApiKey: string;
  phrase: string;
  baseLanguage: string;
  targetLanguages: string[];
}

interface TranslationResult {
  languageCode: string;
  translation: string;
}

function toIso639(code: string): string {
  return code.split("-")[0].toLowerCase();
}

export function POST(req: NextRequest): Promise<NextResponse> {
  return runTranslateRoute(req, "google", async (raw) => {
    const body = raw as unknown as GoogleTranslateRequestBody;
    const { googleApiKey, phrase, baseLanguage, targetLanguages } = body;

    if (!googleApiKey) {
      return NextResponse.json(
        { error: "Google Cloud Translation API key is not configured" },
        { status: 400 }
      );
    }
    const invalid = validateTranslateInput(body);
    if (invalid) return invalid;

    const opened = openApiKey(googleApiKey);
    if (!opened.ok) return opened.response;

    // The key goes in a header, not ?key=, so it stays out of URL logs
    const endpoint = "https://translation.googleapis.com/language/translate/v2";
    const source = toIso639(baseLanguage);

    const promises = targetLanguages.map(async (langCode): Promise<TranslationResult | null> => {
      try {
        const target = toIso639(langCode);

        const response = await fetchProvider(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": opened.key },
          body: JSON.stringify({
            q: phrase,
            source,
            target,
            format: "text",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
          console.error(
            `Google Translate error for ${langCode}:`,
            response.status,
            errorMessage
          );
          return null;
        }

        const data = await response.json();
        const translatedText = data?.data?.translations?.[0]?.translatedText;
        if (typeof translatedText !== "string") return null;
        
        return {
          languageCode: langCode,
          translation: translatedText,
        };
      } catch (error) {
        console.error(`Google Translate error for ${langCode}:`, error);
        return null;
      }
    });

    const settled = await Promise.all(promises);
    const results: TranslationResult[] = settled.filter(
      (r): r is TranslationResult => r !== null
    );

    if (results.length === 0) {
      return NextResponse.json(
        { error: "All translation requests to Google Translate failed", detail: "Check API key and quota" },
        { status: 502 }
      );
    }

    return NextResponse.json(results);
  });
}
