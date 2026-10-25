import type { TranslationSettings } from "@/src/types";
import { authedFetch } from "@/src/lib/marketplace-auth/authedFetch";

/** Settings fields that hold provider API keys; stored only in sealed form. */
export const SECRET_FIELDS = ["openAIApiKey", "anthropicApiKey", "googleApiKey"] as const;

type SecretField = (typeof SECRET_FIELDS)[number];

/** Same marker as SEAL_VERSION in src/lib/secret-crypto.ts (server-only). */
export function isSealedSecret(value: string): boolean {
  return value.startsWith("v1.");
}

export function hasPlaintextSecrets(settings: TranslationSettings): boolean {
  return SECRET_FIELDS.some((f) => settings[f] && !isSealedSecret(settings[f]));
}

/** Returns `settings` with every API key encrypted by the server. */
export async function sealTranslationSecrets(
  settings: TranslationSettings
): Promise<TranslationSettings> {
  if (!hasPlaintextSecrets(settings)) return settings;

  const secrets = Object.fromEntries(SECRET_FIELDS.map((f) => [f, settings[f] ?? ""]));
  const response = await authedFetch("/api/translate/seal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secrets }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.detail || body?.error || `Could not encrypt API keys (${response.status})`);
  }

  const sealed = body.secrets as Record<SecretField, string>;
  return { ...settings, ...sealed };
}
