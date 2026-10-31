/**
 * Shared server-side checks for the /api/translate/* routes.
 */

import { NextResponse } from "next/server";
import { auditLog } from "@/src/lib/marketplace-auth/audit-log";
import { requireSitecoreUser, type SitecoreUser } from "@/src/lib/marketplace-auth/server";
import { BlockedUrlError, safeRequest } from "./ssrfGuard";
import {
  EncryptionUnavailableError,
  SecretSealError,
  openSecret,
} from "@/src/lib/secret-crypto";

const MAX_PHRASE_LENGTH = 5000;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TARGET_LANGUAGES = 50;
/** Site name, dictionary name, entry name and key: context only, never long */
const MAX_CONTEXT_LENGTH = 500;
const CONTEXT_FIELDS = ["siteName", "dictionaryName", "name", "key"] as const;
const MAX_UPSTREAM_RESPONSE_BYTES = 1_000_000;
const UPSTREAM_TIMEOUT_MS = 20_000;

const LANGUAGE_CODE_PATTERN = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/;

// Per user, per server instance (in memory): enough to stop a runaway client,
// not a global quota. Provider quotas still apply on top.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitBuckets = new Map<string, { windowStart: number; count: number }>();

interface TranslateInput {
  phrase?: unknown;
  description?: unknown;
  baseLanguage?: unknown;
  targetLanguages?: unknown;
  siteName?: unknown;
  dictionaryName?: unknown;
  name?: unknown;
  key?: unknown;
}

interface TranslationResult {
  languageCode: string;
  translation: string;
}

/**
 * Counts a request against the caller's per-minute budget. Returns a 429
 * response when the budget is used up, or null if the request may proceed.
 */
export function checkRateLimit(bucket: string, sub: string): NextResponse | null {
  const now = Date.now();
  if (rateLimitBuckets.size > 10_000) {
    for (const [k, v] of rateLimitBuckets) {
      if (now - v.windowStart >= RATE_LIMIT_WINDOW_MS) rateLimitBuckets.delete(k);
    }
  }
  const id = `${bucket}:${sub}`;
  const entry = rateLimitBuckets.get(id);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(id, { windowStart: now, count: 1 });
    return null;
  }
  entry.count += 1;
  if (entry.count <= RATE_LIMIT_MAX_REQUESTS) return null;
  const retryAfter = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
  return NextResponse.json(
    { error: "Too many requests. Wait a minute and try again." },
    { status: 429, headers: { "Retry-After": String(Math.max(retryAfter, 1)) } }
  );
}

/**
 * Runs a /api/translate/<provider> handler: requires a signed-in user,
 * applies the rate limit, parses the JSON body and writes one audit line
 * per request (provider, outcome, phrase count, characters, target
 * languages; never the text or the API key).
 */
export async function runTranslateRoute(
  req: Request,
  provider: string,
  handler: (body: Record<string, unknown>, user: SitecoreUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await requireSitecoreUser(req);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  let body: Record<string, unknown> | null = null;
  let response: NextResponse;
  const limited = checkRateLimit("translate", user.sub);
  if (limited) {
    response = limited;
  } else {
    try {
      const parsed: unknown = await req.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // handled below
    }
    if (!body) {
      response = NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    } else {
      try {
        response = await handler(body, user);
      } catch (error) {
        console.error(`${provider} translation route error:`, error);
        response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }
    }
  }

  const status = response.status;
  const phrase = typeof body?.phrase === "string" ? body.phrase : "";
  const description = typeof body?.description === "string" ? body.description : "";
  const targets = Array.isArray(body?.targetLanguages)
    ? (body.targetLanguages as unknown[])
        .filter((l): l is string => typeof l === "string" && LANGUAGE_CODE_PATTERN.test(l))
        .slice(0, MAX_TARGET_LANGUAGES)
    : [];
  auditLog(req, {
    event: "translate",
    outcome: status < 400 ? "allow" : status < 500 && status !== 422 ? "deny" : "error",
    status,
    sub: user.sub,
    org: user.organizationId,
    provider,
    phrases: phrase ? 1 : 0,
    characters: phrase.length + description.length,
    targetLanguages: targets,
  });
  return response;
}

/**
 * Keeps only well-formed results for languages that were asked for, so
 * whatever the provider returns reaches the browser as plain strings.
 */
export function sanitizeTranslations(results: unknown, targetLanguages: string[]): TranslationResult[] {
  if (!Array.isArray(results)) return [];
  const wanted = new Set(targetLanguages);
  return results
    .filter(
      (r): r is TranslationResult =>
        !!r &&
        typeof r === "object" &&
        typeof (r as TranslationResult).languageCode === "string" &&
        typeof (r as TranslationResult).translation === "string" &&
        wanted.has((r as TranslationResult).languageCode)
    )
    .map((r) => ({ languageCode: r.languageCode, translation: r.translation }));
}

/**
 * Returns a 400 response for missing or oversized input, or null if it is
 * fine. A request carries exactly one phrase (at most MAX_PHRASE_LENGTH
 * characters) and at most MAX_TARGET_LANGUAGES target languages.
 */
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
  if (typeof body.baseLanguage !== "string" || !LANGUAGE_CODE_PATTERN.test(body.baseLanguage)) {
    return NextResponse.json({ error: "Invalid source language code" }, { status: 400 });
  }
  for (const field of CONTEXT_FIELDS) {
    const value = body[field];
    if (value !== undefined && (typeof value !== "string" || value.length > MAX_CONTEXT_LENGTH)) {
      return NextResponse.json(
        { error: `${field} must be text of at most ${MAX_CONTEXT_LENGTH} characters` },
        { status: 400 }
      );
    }
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
