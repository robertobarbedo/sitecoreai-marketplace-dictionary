import { NextRequest, NextResponse } from "next/server";
import { requireSitecoreUser } from "@/src/lib/marketplace-auth/server";
import { EncryptionUnavailableError, ensureSealed } from "@/src/lib/secret-crypto";

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

  let secrets: unknown;
  try {
    secrets = (await req.json())?.secrets;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) {
    return NextResponse.json({ error: "Expected a secrets object" }, { status: 400 });
  }
  const entries = Object.entries(secrets);
  if (
    entries.length > MAX_SECRETS ||
    !entries.every(([, v]) => typeof v === "string" && v.length <= MAX_SECRET_LENGTH)
  ) {
    return NextResponse.json({ error: "Invalid secrets" }, { status: 400 });
  }

  try {
    const sealed = Object.fromEntries(
      entries.map(([field, value]) => [field, value ? ensureSealed((value as string).trim()) : ""])
    );
    return NextResponse.json({ secrets: sealed });
  } catch (error) {
    if (error instanceof EncryptionUnavailableError) {
      console.error("API key encryption unavailable:", error.message);
      return NextResponse.json(
        { error: "API key encryption is not configured on the server", detail: error.message },
        { status: 500 }
      );
    }
    console.error("Seal route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
