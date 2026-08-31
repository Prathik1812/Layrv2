import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "../_core/cookies";
import {
  clearFailedSignIn,
  createLocalUser,
  createEmailVerificationToken,
  createPasswordResetToken,
  consumeAuthRateLimit,
  getLocalCredentialByEmail,
  hasActiveEmailVerificationToken,
  hasActivePasswordResetToken,
  markUserSignedIn,
  registerFailedSignIn,
  resetPasswordWithToken,
  verifyEmailWithToken,
} from "../db";
import {
  createLocalSessionToken,
  createResetToken,
  EMAIL_VERIFICATION_TOKEN_MAX_AGE_MS,
  getRequestIp,
  hashPassword,
  hashRateLimitKey,
  hashResetToken,
  LOCAL_AUTH_COOKIE,
  LOCAL_SESSION_MAX_AGE_MS,
  normalizeEmail,
  RESET_TOKEN_MAX_AGE_MS,
  verifyPassword,
} from "../localAuth";
import { publicProcedure, router } from "../_core/trpc";

const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(256, "Password is too long.");
const emailSchema = z.string().trim().email("Enter a valid email address.").max(320);
const SIGN_IN_WINDOW_MS = 1000 * 60 * 15;
const SIGN_IN_IP_ATTEMPTS = 15;
const SIGN_IN_EMAIL_ATTEMPTS = 8;
const MAX_FAILED_PASSWORDS = 5;
const LOCKOUT_MS = 1000 * 60 * 15;
const VERIFICATION_RESEND_WINDOW_MS = 1000 * 60 * 60;
const VERIFICATION_RESEND_ATTEMPTS = 3;

function setLocalSessionCookie(ctx: { req: any; res: any }, session: { userId: number; sessionVersion: number }, user: { id: number; name: string | null; email: string | null }) {
  return createLocalSessionToken(session).then(token => {
    ctx.res.cookie(LOCAL_AUTH_COOKIE, token, {
      ...getSessionCookieOptions(ctx.req),
      maxAge: LOCAL_SESSION_MAX_AGE_MS,
    });
    return { user: { id: user.id, name: user.name, email: user.email } };
  });
}

async function createVerificationLink(userId: number) {
  const token = createResetToken();
  await createEmailVerificationToken({
    userId,
    tokenHash: await hashResetToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_MAX_AGE_MS),
  });
  return `/verify-email?token=${encodeURIComponent(token)}`;
}

async function enforceSignInRateLimit(ctx: { req: any }, email: string) {
  const headers = ctx.req.headers as Record<string, string | string[] | undefined>;
  const ip = getRequestIp(headers, ctx.req.ip);
  const [ipLimit, emailLimit] = await Promise.all([
    consumeAuthRateLimit({ bucket: "sign-in-ip", keyHash: await hashRateLimitKey(ip), limit: SIGN_IN_IP_ATTEMPTS, windowMs: SIGN_IN_WINDOW_MS }),
    consumeAuthRateLimit({ bucket: "sign-in-email", keyHash: await hashRateLimitKey(email), limit: SIGN_IN_EMAIL_ATTEMPTS, windowMs: SIGN_IN_WINDOW_MS }),
  ]);
  const retryAfterMs = Math.max(ipLimit.retryAfterMs, emailLimit.retryAfterMs);
  if (retryAfterMs > 0) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Please wait before trying again." });
  }
}

export const localAuthRouter = router({
  signUp: publicProcedure.input(z.object({
    name: z.string().trim().min(1, "Enter your name.").max(120).optional(),
    email: emailSchema,
    password: passwordSchema,
  })).mutation(async ({ input }) => {
    const email = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);
    let user;
    try {
      user = await createLocalUser({
        openId: `local_${randomUUID()}`,
        email,
        name: input.name?.trim() || null,
        passwordHash,
      });
    } catch {
      throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email address." });
    }
    if (!user) throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email address." });
    const debugVerificationUrl = await createVerificationLink(user.id);
    return {
      requiresVerification: true as const,
      ...(process.env.NODE_ENV === "development" ? { debugVerificationUrl } : {}),
    };
  }),

  signIn: publicProcedure.input(z.object({ email: emailSchema, password: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const email = normalizeEmail(input.email);
      await enforceSignInRateLimit(ctx, email);
      const record = await getLocalCredentialByEmail(email);
      if (record?.credential.lockedUntil && record.credential.lockedUntil > new Date()) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "This account is temporarily locked. Please try again later." });
      }
      if (!record || !await verifyPassword(input.password, record.credential.passwordHash)) {
        if (record) {
          const failure = await registerFailedSignIn(record.user.id, { maxFailures: MAX_FAILED_PASSWORDS, failureWindowMs: SIGN_IN_WINDOW_MS, lockoutMs: LOCKOUT_MS });
          if (failure?.lockedUntil) {
            throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "This account is temporarily locked. Please try again later." });
          }
        }
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      }
      await clearFailedSignIn(record.user.id);
      if (!record.credential.emailVerifiedAt) {
        const debugVerificationUrl = await createVerificationLink(record.user.id);
        return {
          requiresVerification: true as const,
          ...(process.env.NODE_ENV === "development" ? { debugVerificationUrl } : {}),
        };
      }
      await markUserSignedIn(record.user.id);
      return { requiresVerification: false as const, ...await setLocalSessionCookie(ctx, { userId: record.user.id, sessionVersion: record.credential.sessionVersion }, record.user) };
    }),

  requestEmailVerification: publicProcedure.input(z.object({ email: emailSchema })).mutation(async ({ ctx, input }) => {
    const email = normalizeEmail(input.email);
    const headers = ctx.req.headers as Record<string, string | string[] | undefined>;
    const ip = getRequestIp(headers, ctx.req.ip);
    const rateLimit = await consumeAuthRateLimit({ bucket: "verification-resend-ip", keyHash: await hashRateLimitKey(ip), limit: VERIFICATION_RESEND_ATTEMPTS, windowMs: VERIFICATION_RESEND_WINDOW_MS });
    if (!rateLimit.allowed) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many verification requests. Please wait before trying again." });
    const record = await getLocalCredentialByEmail(email);
    const response: { success: true; debugVerificationUrl?: string } = { success: true };
    if (!record || record.credential.emailVerifiedAt) return response;
    const debugVerificationUrl = await createVerificationLink(record.user.id);
    if (process.env.NODE_ENV === "development") response.debugVerificationUrl = debugVerificationUrl;
    return response;
  }),

  validateEmailVerification: publicProcedure.input(z.object({ token: z.string().min(32).max(256) })).query(async ({ input }) => ({
    valid: await hasActiveEmailVerificationToken(await hashResetToken(input.token)),
  })),

  verifyEmail: publicProcedure.input(z.object({ token: z.string().min(32).max(256) })).mutation(async ({ ctx, input }) => {
    const verified = await verifyEmailWithToken(await hashResetToken(input.token));
    if (!verified) throw new TRPCError({ code: "BAD_REQUEST", message: "This verification link is invalid or has expired." });
    return { requiresVerification: false as const, ...await setLocalSessionCookie(ctx, { userId: verified.user.id, sessionVersion: verified.sessionVersion }, verified.user) };
  }),

  requestPasswordReset: publicProcedure.input(z.object({ email: emailSchema })).mutation(async ({ input }) => {
    const record = await getLocalCredentialByEmail(normalizeEmail(input.email));
    const response: { success: true; debugResetUrl?: string } = { success: true };
    if (!record) return response;

    const token = createResetToken();
    await createPasswordResetToken({
      userId: record.user.id,
      tokenHash: await hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_MAX_AGE_MS),
    });
    if (process.env.NODE_ENV === "development") {
      response.debugResetUrl = `/reset-password?token=${encodeURIComponent(token)}`;
    }
    return response;
  }),

  validatePasswordReset: publicProcedure.input(z.object({ token: z.string().min(32).max(256) })).query(async ({ input }) => ({
    valid: await hasActivePasswordResetToken(await hashResetToken(input.token)),
  })),

  resetPassword: publicProcedure.input(z.object({ token: z.string().min(32).max(256), password: passwordSchema }))
    .mutation(async ({ ctx, input }) => {
      const reset = await resetPasswordWithToken({
        tokenHash: await hashResetToken(input.token),
        passwordHash: await hashPassword(input.password),
      });
      if (!reset) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired." });
      return setLocalSessionCookie(ctx, { userId: reset.user.id, sessionVersion: reset.sessionVersion }, reset.user);
    }),
});
