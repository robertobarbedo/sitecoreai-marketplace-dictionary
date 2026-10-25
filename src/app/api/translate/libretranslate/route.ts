import { NextRequest, NextResponse } from "next/server";
import { requireSitecoreUser } from "@/src/lib/marketplace-auth/server";
import {
  fetchUserUrl,
  openApiKey,
  readJsonCapped,
  userUrlErrorResponse,
  validateTranslateInput,
} from "@/src/utils/translate-route";

interface LibreTranslateRequestBody {
  libreTranslateUrl: string;
  /** Sealed by /api/translate/seal */
  libreTranslateApiKey?: string;
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSitecoreUser(req);
  if (!auth.ok) return auth.response;

  try {
    const body: LibreTranslateRequestBody = await req.json();
    const { libreTranslateUrl, phrase, baseLanguage, targetLanguages } = body;

    if (!libreTranslateUrl) {
      return NextResponse.json(
        { error: "LibreTranslate server URL is not configured" },
        { status: 400 }
      );
    }
    const invalid = validateTranslateInput(body);
    if (invalid) return invalid;

    let libreTranslateApiKey: string | undefined;
    if (body.libreTranslateApiKey) {
      const opened = openApiKey(body.libreTranslateApiKey);
      if (!opened.ok) return opened.response;
      libreTranslateApiKey = opened.key;
    }

    const endpoint = `${libreTranslateUrl.replace(/\/+$/, "")}/translate`;
    const source = toIso639(baseLanguage);

    let lastError: unknown = null;
    const promises = targetLanguages.map(async (langCode): Promise<TranslationResult | null> => {
      try {
        const target = toIso639(langCode);

        const requestBody: Record<string, string> = {
          q: phrase,
          source,
          target,
        };
        if (libreTranslateApiKey) {
          requestBody.api_key = libreTranslateApiKey;
        }

        const response = await fetchUserUrl(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `LibreTranslate error for ${langCode}:`,
            response.status,
            errorText.slice(0, 2000)
          );
          return null;
        }

        const data = (await readJsonCapped(response)) as { translatedText?: unknown };
        return {
          languageCode: langCode,
          translation: typeof data?.translatedText === "string" ? data.translatedText : "",
        };
      } catch (error) {
        console.error(`LibreTranslate error for ${langCode}:`, error);
        lastError = error;
        return null;
      }
    });

    const settled = await Promise.all(promises);
    const results: TranslationResult[] = settled.filter(
      (r): r is TranslationResult => r !== null
    );

    if (results.length === 0) {
      if (lastError) return userUrlErrorResponse(lastError, "LibreTranslate server");
      return NextResponse.json(
        { error: "All translation requests to LibreTranslate failed" },
        { status: 502 }
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("LibreTranslate route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
