import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "./_core/env";

const scrypt = promisify(scryptCallback);

export const LOCAL_AUTH_COOKIE = "layr_local_session";
export const LOCAL_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
export const RESET_TOKEN_MAX_AGE_MS = 1000 * 60 * 30;
export const EMAIL_VERIFICATION_TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24;
const SCRYPT_KEY_LENGTH = 64;

type LocalSession = { userId: number; sessionVersion: number };

function getSecretKey() {
  return new TextEncoder().encode(ENV.cookieSecret || "layr_default_secret_key_change_in_production");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scrypt(password, salt, SCRYPT_KEY_LENGTH) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, expected] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;

  try {
    const derived = await scrypt(password, salt, SCRYPT_KEY_LENGTH) as Buffer;
    const expectedBuffer = Buffer.from(expected, "base64url");
    return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
  } catch {
    return false;
  }
}

export function createResetToken() {
  return randomBytes(32).toString("base64url");
}

export async function hashResetToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Buffer.from(digest).toString("hex");
}

export async function hashRateLimitKey(value: string) {
  return hashResetToken(value);
}

export function getRequestIp(headers: Record<string, string | string[] | undefined>, fallback?: string) {
  const forwarded = headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || fallback || "unknown";
}

export async function createLocalSessionToken(session: LocalSession) {
  const issuedAt = Math.floor(Date.now() / 1000);
  return new SignJWT({ sv: session.sessionVersion, typ: "layr-local" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(session.userId))
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + Math.floor(LOCAL_SESSION_MAX_AGE_MS / 1000))
    .sign(getSecretKey());
}

export async function verifyLocalSessionToken(token: string | undefined | null): Promise<LocalSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    const sessionVersion = Number(payload.sv);
    if (payload.typ !== "layr-local" || !Number.isInteger(userId) || userId < 1 || !Number.isInteger(sessionVersion) || sessionVersion < 1) {
      return null;
    }
    return { userId, sessionVersion };
  } catch {
    return null;
  }
}

export function getCookieValue(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) return undefined;
  const prefix = `${cookieName}=`;
  const pair = cookieHeader.split(";").map(value => value.trim()).find(value => value.startsWith(prefix));
  return pair?.slice(prefix.length);
}
