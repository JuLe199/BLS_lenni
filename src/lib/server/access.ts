import { NextRequest, NextResponse } from "next/server";

/**
 * Simple access gate for the AI endpoint (protects the Gemini key from public use).
 * - APP_ACCESS_CODE set → requests need header `x-access-code` with that value.
 * - not set → allowed in development only; in production the endpoint refuses.
 */
export function checkAccess(req: NextRequest): NextResponse | null {
  const expected = process.env.APP_ACCESS_CODE;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "APP_ACCESS_CODE is not configured on the server." }, { status: 503 });
    }
    return null;
  }
  if (req.headers.get("x-access-code") !== expected) {
    return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
  }
  return null;
}
