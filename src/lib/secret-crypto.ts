import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

/**
 * Server-side sealing of translation provider API keys (OpenAI, Google,
 * LibreTranslate).
 *
 * A key is only handled in plaintext here, on the server: when the user saves
 * it (/api/translate/seal) and when a translate route calls the provider.
 * What is stored in the Sitecore settings item and held by the browser is
 * AES-256-GCM ciphertext that only this deployment's key can open.
 *
 * The key comes from DICTIONARY_SECRET_ENCRYPTION_KEY (any passphrase of 16+
 * characters; a 32-byte AES key is derived from it with HKDF-SHA256). It is
 * never optional: without it the app refuses to store API keys rather than
 * silently falling back to plaintext.
 */

const KEY_ENV = "DICTIONARY_SECRET_ENCRYPTION_KEY";
const MIN_KEY_LENGTH = 16;

/** Format marker; bump if the wire format ever changes. Mirrored in src/utils/translation-secrets.ts. */
const SEAL_VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;
const HKDF_SALT = "sitecoreai-marketplace-dictionary";
const HKDF_INFO = "translation-provider-api-key";

/** The deployment has no (usable) DICTIONARY_SECRET_ENCRYPTION_KEY. */
export class EncryptionUnavailableError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "EncryptionUnavailableError";
  }
}

/** A sealed key could not be opened — malformed, tampered with, or sealed under a different key. */
export class SecretSealError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "SecretSealError";
  }
}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const passphrase = process.env[KEY_ENV]?.trim();
  if (!passphrase) {
    throw new EncryptionUnavailableError(
      `${KEY_ENV} is not set on the server, so API keys cannot be encrypted.`,
    );
  }
  if (passphrase.length < MIN_KEY_LENGTH) {
    throw new EncryptionUnavailableError(
      `${KEY_ENV} must be at least ${MIN_KEY_LENGTH} characters.`,
    );
  }

  cachedKey = Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(passphrase, "utf8"),
      Buffer.from(HKDF_SALT, "utf8"),
      Buffer.from(HKDF_INFO, "utf8"),
      KEY_BYTES,
    ),
  );
  return cachedKey;
}

/** True for values produced by {@link sealSecret}. */
export function isSealed(value: string): boolean {
  return value.startsWith(`${SEAL_VERSION}.`);
}

/** Encrypts a plaintext key into a self-describing, storable string. */
export function sealSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    SEAL_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/** Decrypts a value produced by {@link sealSecret}. */
export function openSecret(sealed: string): string {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== SEAL_VERSION) {
    throw new SecretSealError(
      "The API key is not encrypted. Open Settings › Translations and save the key again.",
    );
  }

  const [, iv, tag, ciphertext] = parts;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof EncryptionUnavailableError) {
      throw error;
    }
    // Wrong key or tampered payload — indistinguishable, and both mean the
    // user has to enter the key again.
    throw new SecretSealError(
      "The stored API key could not be decrypted. It was most likely encrypted with a different server key; enter it again in Settings › Translations.",
    );
  }
}

/** Seals `value` unless it already is sealed. */
export function ensureSealed(value: string): string {
  return isSealed(value) ? value : sealSecret(value);
}
