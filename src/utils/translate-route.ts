/**
 * Shared server-side checks for the /api/translate/* routes.
 */

import { NextResponse } from "next/server";
import { BlockedUrlError, safeRequest } from "./ssrfGuard";
import {
  EncryptionUnavailableError,
  SecretSealError,
  openSecret,
} from "@/src/lib/secret-crypto";

const MAX_PHRASE_LENGTH = 5000;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TARGET_LANGUAGES = 50;
const MAX_UPSTREAM_RESPONSE_BYTES = 1_000_000;
const UPSTREAM_TIMEOUT_MS = 20_000;

const LANGUAGE_CODE_PATTERN = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/;

interface TranslateInput {
  phrase?: unknown;
  description?: unknown;
  targetLanguages?: unknown;
}

/** Returns an error response for missing or oversized input, or null if it is fine. */
export function validateTranslateInput(body: TranslateInput): NextResponse | null {
  if (typeof body.phrase !== "string" || !body.phrase) {
    return NextResponse.json({ error: "Missing phrase to translate" }, { status: 400 });
  }
  if (body.phrase.length > MAX_PHRASE_LENGTH) {
    return NextResponse.json(
      { error: `Phrase is longer than ${MAX_PHRASE_LENGTH} characters` },
      { status: 400 }
    );
  }
  if (
    body.description !== undefined &&
    (typeof body.description !== "string" || body.description.length > MAX_DESCRIPTION_LENGTH)
  ) {
    return NextResponse.json(
      { error: `Description is longer than ${MAX_DESCRIPTION_LENGTH} characters` },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.targetLanguages) || body.targetLanguages.length === 0) {
    return NextResponse.json({ error: "No target languages specified" }, { status: 400 });
  }
  if (body.targetLanguages.length > MAX_TARGET_LANGUAGES) {
    return NextResponse.json(
      { error: `At most ${MAX_TARGET_LANGUAGES} target languages per request` },
      { status: 400 }
    );
  }
  if (!body.targetLanguages.every((l) => typeof l === "string" && LANGUAGE_CODE_PATTERN.test(l))) {
    return NextResponse.json({ error: "Invalid target language code" }, { status: 400 });
  }
  return null;
}

/** Decrypts a sealed API key, or returns the error response to send. */
export function openApiKey(
  sealed: string
): { ok: true; key: string } | { ok: false; response: NextResponse } {
  try {
    return { ok: true, key: openSecret(sealed) };
  } catch (error) {
    if (error instanceof EncryptionUnavailableError) {
      console.error("API key encryption unavailable:", error.message);
      return {
        ok: false,
        response: NextResponse.json(
          { error: "API key encryption is not configured on the server", detail: error.message },
          { status: 500 }
        ),
      };
    }
    if (error instanceof SecretSealError) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unreadable API key", detail: error.message }, { status: 400 }),
      };
    }
    throw error;
  }
}

/**
 * Maps a provider's error status to a fixed message. The provider's own
 * message and status are logged by the caller, never sent to the browser.
 */
export function providerErrorResponse(label: string, status: number | undefined): NextResponse {
  let error: string;
  if (status === 401 || status === 403) {
    error = `${label} rejected the API key. Check it in Settings › Translations.`;
  } else if (status === 429) {
    error = `${label} rate limit or quota was exceeded. Try again later.`;
  } else if (status === 400 || status === 404 || status === 422) {
    error = `${label} rejected the request. Check the model name in Settings › Translations.`;
  } else {
    error = `${label} is unavailable. Try again later.`;
  }
  return NextResponse.json({ error }, { status: 502 });
}

/** Fetch with a timeout, for fixed provider hosts. */
export function fetchProvider(url: string | URL, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
}

/**
 * Fetches a user-supplied URL through the SSRF guard: public hosts only,
 * checked at connect time, no redirects followed, with a timeout and a cap
 * on the body read (an oversized body fails JSON parsing downstream).
 */
export async function fetchUserUrl(
  raw: string,
  init: { method: string; headers?: Record<string, string>; body?: string }
): Promise<Response> {
  const { response } = await safeRequest(raw, {
    ...init,
    timeoutMs: UPSTREAM_TIMEOUT_MS,
    maxBodyBytes: MAX_UPSTREAM_RESPONSE_BYTES + 1,
  });
  return response;
}

/** Reads a response body as JSON, refusing bodies larger than the cap. */
export async function readJsonCapped(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length > MAX_UPSTREAM_RESPONSE_BYTES) {
    throw new Error("Upstream response is too large");
  }
  return JSON.parse(text);
}

/** Maps a fetchUserUrl failure to a response that does not echo upstream content. */
export function userUrlErrorResponse(error: unknown, label: string): NextResponse {
  if (error instanceof BlockedUrlError) {
    return NextResponse.json({ error: `${label} URL is not allowed`, detail: error.message }, { status: 400 });
  }
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return NextResponse.json({ error: `${label} did not respond in time` }, { status: 504 });
  }
  return NextResponse.json({ error: `Could not reach ${label}` }, { status: 502 });
}
