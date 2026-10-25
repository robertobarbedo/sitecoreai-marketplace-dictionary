import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { requireSitecoreUser } from "@/src/lib/marketplace-auth/server";
import { openApiKey, validateTranslateInput } from "@/src/utils/translate-route";

const DEFAULT_MODEL = "claude-opus-5-5";
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

// Models that accept server-side refusal fallbacks (`fallbacks: "default"`).
// Other models are called without them, since the parameter would be rejected.
const FALLBACK_MODELS = new Set([
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
]);

const TranslationsSchema = z.object({
  translations: z.array(
    z.object({
      languageCode: z.string(),
      translation: z.string(),
    })
  ),
});

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSitecoreUser(req);
  if (!auth.ok) return auth.response;

  try {
    const body: TranslateRequestBody = await req.json();

    const {
      apiKey,
      siteName,
      dictionaryName,
      name,
      key,
      phrase,
      baseLanguage,
      description,
      targetLanguages,
    } = body;
    const model = body.model || DEFAULT_MODEL;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }
    const invalid = validateTranslateInput(body);
    if (invalid) return invalid;
    if (!MODEL_PATTERN.test(model)) {
      return NextResponse.json({ error: "Invalid model name" }, { status: 400 });
    }

    const opened = openApiKey(apiKey);
    if (!opened.ok) return opened.response;

    const systemPrompt = `You are a professional translator working on a website dictionary. Translate the provided phrase accurately and naturally into each of the specified target languages, taking all available context into account.

Return one entry per target language. "languageCode" must be the BCP-47 code exactly as provided, and "translation" the translated text only.`;

    const userPrompt = [
      `Site: ${siteName}`,
      `Dictionary: ${dictionaryName}`,
      `Entry name: ${name}`,
      `Dictionary key: ${key}`,
      `Original language: ${baseLanguage}`,
      `Original phrase: "${phrase}"`,
      description ? `Description / context: ${description}` : null,
      `Translate into: ${targetLanguages.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const client = new Anthropic({ apiKey: opened.key, timeout: 60_000, maxRetries: 1 });
    const withFallbacks = FALLBACK_MODELS.has(model);

    let response;
    try {
      response = await client.beta.messages.parse({
        model,
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        // Translating a short phrase is a simple task
        output_config: {
          effort: "low",
          format: betaZodOutputFormat(TranslationsSchema),
        },
        // If a safety classifier declines, retry on Anthropic's recommended model
        ...(withFallbacks
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error("Anthropic API error:", error.status, error.message);
        return NextResponse.json(
          { error: `Anthropic returned ${error.status ?? "an error"}`, detail: error.message },
          { status: error.status && error.status >= 400 ? error.status : 502 }
        );
      }
      throw error;
    }

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "Anthropic declined to translate this phrase" },
        { status: 422 }
      );
    }
    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "Unexpected response structure from Anthropic" },
        { status: 502 }
      );
    }

    return NextResponse.json(response.parsed_output.translations);
  } catch (error) {
    console.error("Anthropic translation route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
