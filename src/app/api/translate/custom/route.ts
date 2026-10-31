import { NextRequest, NextResponse } from "next/server";
import {
  fetchUserUrl,
  readJsonCapped,
  runTranslateRoute,
  sanitizeTranslations,
  userUrlErrorResponse,
  validateTranslateInput,
} from "@/src/utils/translate-route";

interface CustomTranslateRequestBody {
  customUrl: string;
  siteName: string;
  dictionaryName: string;
  key: string;
  phrase: string;
  baseLanguage: string;
  description?: string;
  targetLanguages: string[];
}

export function POST(req: NextRequest): Promise<NextResponse> {
  return runTranslateRoute(req, "custom", async (raw) => {
    const body = raw as unknown as CustomTranslateRequestBody;
    const { customUrl, ...payload } = body;

    if (!customUrl) {
      return NextResponse.json(
        { error: "Custom translation URL is not configured" },
        { status: 400 }
      );
    }
    const invalid = validateTranslateInput(payload);
    if (invalid) return invalid;

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetchUserUrl(customUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Custom translation endpoint fetch error:", error);
      return userUrlErrorResponse(error, "Custom endpoint");
    }

    if (!upstreamResponse.ok) {
      // Log only the status: the body could echo dictionary content
      console.error("Custom translation endpoint error:", upstreamResponse.status);
      return NextResponse.json(
        { error: `Custom endpoint returned ${upstreamResponse.status}` },
        { status: 502 }
      );
    }

    let results: unknown;
    try {
      results = await readJsonCapped(upstreamResponse);
    } catch {
      return NextResponse.json(
        { error: "Custom translation endpoint did not return valid JSON" },
        { status: 502 }
      );
    }

    if (!Array.isArray(results)) {
      return NextResponse.json(
        { error: "Unexpected response format from custom translation endpoint" },
        { status: 502 }
      );
    }

    // Pass through only the expected fields, as plain strings
    return NextResponse.json(sanitizeTranslations(results, payload.targetLanguages));
  });
}
