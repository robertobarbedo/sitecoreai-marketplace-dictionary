import { NextRequest, NextResponse } from "next/server";
import { requireSitecoreUser } from "@/src/lib/marketplace-auth/server";
import {
  fetchProvider,
  openApiKey,
  providerErrorResponse,
  validateTranslateInput,
} from "@/src/utils/translate-route";

const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

interface TranslateRequestBody {
  /** Sealed by /api/translate/seal */
  apiKey: string;
  model: string;
  siteName: string;
  dictionaryName: string;
  name: string;
  key: string;
  phrase: string;
  baseLanguage: string;
  description?: string;
  targetLanguages: string[];
}

interface TranslationResult {
  languageCode: string;
  translation: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSitecoreUser(req);
  if (!auth.ok) return auth.response;

  try {
    const body: TranslateRequestBody = await req.json();

    const {
      apiKey,
      model,
      siteName,
      dictionaryName,
      name,
      key,
      phrase,
      baseLanguage,
      description,
      targetLanguages,
    } = body;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }
    const invalid = validateTranslateInput(body);
    if (invalid) return invalid;
    if (model && !MODEL_PATTERN.test(model)) {
      return NextResponse.json({ error: "Invalid model name" }, { status: 400 });
    }

    const opened = openApiKey(apiKey);
    if (!opened.ok) return opened.response;

    const languageList = targetLanguages.join(", ");

    const systemPrompt = `You are a professional translator working on a website dictionary. Translate the provided phrase accurately and naturally into each of the specified target languages, taking all available context into account.

Return ONLY a valid JSON object with a single key "translations" whose value is an array. Each array element must have exactly two fields: "languageCode" (the BCP-47 language code exactly as provided) and "translation" (the translated text). No additional text, markdown, or explanation.`;

    const contextLines = [
      `Site: ${siteName}`,
      `Dictionary: ${dictionaryName}`,
      `Entry name: ${name}`,
      `Dictionary key: ${key}`,
      `Original language: ${baseLanguage}`,
      `Original phrase: "${phrase}"`,
      description ? `Description / context: ${description}` : null,
      `Translate into: ${languageList}`,
    ]
      .filter(Boolean)
      .join("\n");

    const userPrompt = contextLines;

    const openAIResponse = await fetchProvider(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opened.key}`,
        },
        body: JSON.stringify({
          model: model || "gpt-5-nano",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!openAIResponse.ok) {
      // Log the body but don't return it: the browser only gets a fixed message
      console.error(
        "OpenAI API error:",
        openAIResponse.status,
        (await openAIResponse.text()).slice(0, 2000)
      );
      return providerErrorResponse("OpenAI", openAIResponse.status);
    }

    const openAIData = await openAIResponse.json();
    const content: string = openAIData.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse OpenAI response as JSON" },
        { status: 500 }
      );
    }

    // Handle both { translations: [...] } and direct array responses
    let results: TranslationResult[];
    if (Array.isArray(parsed)) {
      results = parsed;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      "translations" in parsed &&
      Array.isArray((parsed as Record<string, unknown>).translations)
    ) {
      results = (parsed as { translations: TranslationResult[] }).translations;
    } else {
      return NextResponse.json(
        { error: "Unexpected response structure from OpenAI" },
        { status: 500 }
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Translation route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
