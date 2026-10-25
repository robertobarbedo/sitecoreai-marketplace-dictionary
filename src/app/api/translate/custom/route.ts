import { NextRequest, NextResponse } from "next/server";
import { requireSitecoreUser } from "@/src/lib/marketplace-auth/server";
import {
  fetchUserUrl,
  readJsonCapped,
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSitecoreUser(req);
  if (!auth.ok) return auth.response;

  try {
    const body: CustomTranslateRequestBody = await req.json();
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
      // Log the body but don't return it: the browser only learns the status
      console.error(
        "Custom translation endpoint error:",
        upstreamResponse.status,
        (await upstreamResponse.text()).slice(0, 2000)
      );
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

    // Pass through only the expected fields
    return NextResponse.json(
      results
        .filter((r) => r && typeof r.languageCode === "string" && typeof r.translation === "string")
        .map((r) => ({ languageCode: r.languageCode, translation: r.translation }))
    );
  } catch (error) {
    console.error("Custom translation route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
