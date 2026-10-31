import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/src/lib/marketplace-auth/audit-log";
import { requireSitecoreUser, type SitecoreUser } from "@/src/lib/marketplace-auth/server";
import { EncryptionUnavailableError, ensureSealed } from "@/src/lib/secret-crypto";
import { checkRateLimit } from "@/src/utils/translate-route";

const MAX_SECRETS = 10;
const MAX_SECRET_LENGTH = 1000;

/**
 * Encrypts translation provider API keys before the browser stores them in
 * the Sitecore settings item. Body: { secrets: { [field]: plaintext } };
 * returns { secrets: { [field]: sealed } }. Values that are already sealed
 * are returned unchanged; empty values stay empty.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSitecoreUser(req);
  if (!auth.ok) return auth.response;

  const { response, fields } = await seal(req, auth.user);
  // Counts only: never the field values
  auditLog(req, {
    event: "secret.seal",
    outcome: response.status < 400 ? "allow" : response.status < 500 ? "deny" : "error",
    status: response.status,
    sub: auth.user.sub,
    org: auth.user.organizationId,
    fields,
  });
  return response;
}

async function seal(
  req: NextRequest,
  user: SitecoreUser
): Promise<{ response: NextResponse; fields: number }> {
  const limited = checkRateLimit("seal", user.sub);
  if (limited) return { response: limited, fields: 0 };

  let secrets: unknown;
  try {
    secrets = (await req.json())?.secrets;
  } catch {
    return { response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }), fields: 0 };
  }

  if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) {
    return {
      response: NextResponse.json({ error: "Expected a secrets object" }, { status: 400 }),
      fields: 0,
    };
  }
  const entries = Object.entries(secrets);
  if (
    entries.length > MAX_SECRETS ||
    !entries.every(([, v]) => typeof v === "string" && v.length <= MAX_SECRET_LENGTH)
  ) {
    return { response: NextResponse.json({ error: "Invalid secrets" }, { status: 400 }), fields: 0 };
  }

  try {
    const sealed = Object.fromEntries(
      entries.map(([field, value]) => [field, value ? ensureSealed((value as string).trim()) : ""])
    );
    return { response: NextResponse.json({ secrets: sealed }), fields: entries.length };
  } catch (error) {
    if (error instanceof EncryptionUnavailableError) {
      console.error("API key encryption unavailable:", error.message);
      return {
        response: NextResponse.json(
          { error: "API key encryption is not configured on the server", detail: error.message },
          { status: 500 }
        ),
        fields: entries.length,
      };
    }
    console.error("Seal route error:", error);
    return {
      response: NextResponse.json({ error: "Internal server error" }, { status: 500 }),
      fields: entries.length,
    };
  }
}
