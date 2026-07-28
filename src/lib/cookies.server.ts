import { createHmac } from "node:crypto";

const COOKIE_SECRET = process.env.COOKIE_SECRET;
if (!COOKIE_SECRET) {
  throw new Error("COOKIE_SECRET environment variable is required");
}

const FREE_COOKIE = "sp_free";
const PAID_COOKIE = "sp_paid";

/** Sign a value with HMAC-SHA256 to prevent tampering. */
export function signValue(value: string): string {
  const hmac = createHmac("sha256", COOKIE_SECRET);
  hmac.update(value);
  return `${value}.${hmac.digest("hex").slice(0, 16)}`;
}

/** Verify a signed cookie value. Returns the value if valid, null otherwise. */
export function verifyValue(signed: string): string | null {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;
  const value = signed.slice(0, lastDot);
  const expected = signValue(value);
  const a = Buffer.from(expected);
  const b = Buffer.from(signed);
  if (a.length !== b.length) return null;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0 ? value : null;
}

/** Parse cookies from a Request headers object. */
function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key) cookies[key] = decodeURIComponent((rest.join("=") || "").trim());
  }
  return cookies;
}

export interface CookieStatus {
  hasFree: boolean;
  hasPaid: boolean;
}

/** Read the user's current cookie status from the request. */
export function getCookieStatus(request: Request): CookieStatus {
  const cookies = parseCookies(request);
  return {
    hasFree: verifyValue(cookies[FREE_COOKIE] || "") !== null,
    hasPaid: verifyValue(cookies[PAID_COOKIE] || "") !== null,
  };
}
