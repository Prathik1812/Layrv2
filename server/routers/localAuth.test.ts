import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearFailedSignIn: vi.fn(),
  createLocalUser: vi.fn(),
  createEmailVerificationToken: vi.fn(),
  createPasswordResetToken: vi.fn(),
  consumeAuthRateLimit: vi.fn(),
  getLocalCredentialByEmail: vi.fn(),
  hasActiveEmailVerificationToken: vi.fn(),
  hasActivePasswordResetToken: vi.fn(),
  markUserSignedIn: vi.fn(),
  registerFailedSignIn: vi.fn(),
  resetPasswordWithToken: vi.fn(),
  verifyEmailWithToken: vi.fn(),
}));

vi.mock("../db", () => mocks);

import { appRouter } from "../routers";
import { hashPassword, LOCAL_AUTH_COOKIE } from "../localAuth";

const user = { id: 20, openId: "local_20", name: "Researcher", email: "researcher@example.com", loginMethod: "email-password", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

function caller() {
  const res = { cookie: vi.fn(), clearCookie: vi.fn() };
  const ctx = { req: { protocol: "https", headers: {} }, res, user: null } as never;
  return { caller: appRouter.createCaller(ctx), res };
}

describe("localAuth procedures", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.consumeAuthRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 }); });

  it("signs up without ever passing plaintext to persistence and requires email verification before setting a session", async () => {
    mocks.createLocalUser.mockResolvedValue(user);
    const { caller: api, res } = caller();
    await expect(api.localAuth.signUp({ name: "Researcher", email: "RESEARCHER@example.com", password: "correct horse battery staple" })).resolves.toMatchObject({ requiresVerification: true });
    expect(mocks.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ email: "researcher@example.com", passwordHash: expect.stringMatching(/^scrypt\$/) }));
    expect(mocks.createLocalUser.mock.calls[0][0].passwordHash).not.toContain("correct horse battery staple");
    expect(mocks.createEmailVerificationToken).toHaveBeenCalledWith(expect.objectContaining({ userId: 20, tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("rejects a duplicate normalized email", async () => {
    mocks.createLocalUser.mockResolvedValue(null);
    const { caller: api } = caller();
    await expect(api.localAuth.signUp({ email: "researcher@example.com", password: "correct horse battery staple" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects incorrect credentials and issues a session only after a verified password", async () => {
    const passwordHash = await hashPassword("correct horse battery staple");
    mocks.getLocalCredentialByEmail.mockResolvedValue({ credential: { userId: user.id, passwordHash, sessionVersion: 2, emailVerifiedAt: new Date() }, user });
    const wrong = caller();
    await expect(wrong.caller.localAuth.signIn({ email: user.email!, password: "not the password" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(wrong.res.cookie).not.toHaveBeenCalled();
    expect(mocks.registerFailedSignIn).toHaveBeenCalledWith(20, expect.objectContaining({ maxFailures: 5 }));

    const correct = caller();
    await expect(correct.caller.localAuth.signIn({ email: user.email!, password: "correct horse battery staple" })).resolves.toEqual({ requiresVerification: false, user: { id: 20, name: "Researcher", email: "researcher@example.com" } });
    expect(mocks.clearFailedSignIn).toHaveBeenCalledWith(20);
    expect(mocks.markUserSignedIn).toHaveBeenCalledWith(20);
    expect(correct.res.cookie).toHaveBeenCalledWith(LOCAL_AUTH_COOKIE, expect.any(String), expect.any(Object));
  });

  it("rejects excessive source attempts before checking credentials and blocks temporarily locked accounts", async () => {
    mocks.consumeAuthRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterMs: 120_000 }).mockResolvedValueOnce({ allowed: true, retryAfterMs: 0 });
    await expect(caller().caller.localAuth.signIn({ email: user.email!, password: "not the password" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mocks.getLocalCredentialByEmail).not.toHaveBeenCalled();

    mocks.consumeAuthRateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    mocks.getLocalCredentialByEmail.mockResolvedValue({ credential: { userId: user.id, passwordHash: "unused", sessionVersion: 1, lockedUntil: new Date(Date.now() + 60_000) }, user });
    await expect(caller().caller.localAuth.signIn({ email: user.email!, password: "any password" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });

  it("blocks unverified account sign-in and completes access only after a valid verification token", async () => {
    const passwordHash = await hashPassword("correct horse battery staple");
    mocks.getLocalCredentialByEmail.mockResolvedValue({ credential: { userId: user.id, passwordHash, sessionVersion: 1, emailVerifiedAt: null }, user });
    const pending = caller();
    await expect(pending.caller.localAuth.signIn({ email: user.email!, password: "correct horse battery staple" })).resolves.toMatchObject({ requiresVerification: true });
    expect(pending.res.cookie).not.toHaveBeenCalled();
    expect(mocks.createEmailVerificationToken).toHaveBeenCalled();

    mocks.verifyEmailWithToken.mockResolvedValue({ user, sessionVersion: 2 });
    const verified = caller();
    await expect(verified.caller.localAuth.verifyEmail({ token: "a".repeat(43) })).resolves.toEqual({ requiresVerification: false, user: { id: 20, name: "Researcher", email: "researcher@example.com" } });
    expect(verified.res.cookie).toHaveBeenCalledWith(LOCAL_AUTH_COOKIE, expect.any(String), expect.objectContaining({ httpOnly: true }));
  });

  it("returns the same production recovery acknowledgement for unknown and known emails", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    mocks.getLocalCredentialByEmail.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ credential: { userId: user.id }, user });
    const api = caller().caller;
    const unknown = await api.localAuth.requestPasswordReset({ email: "unknown@example.com" });
    const known = await api.localAuth.requestPasswordReset({ email: user.email! });
    expect(unknown).toEqual({ success: true });
    expect(known).toEqual({ success: true });
    expect(mocks.createPasswordResetToken).toHaveBeenCalledWith(expect.objectContaining({ userId: 20, tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    process.env.NODE_ENV = previous;
  });

  it("rejects expired or already-used reset tokens without creating a session", async () => {
    mocks.resetPasswordWithToken.mockResolvedValue(null);
    const { caller: api, res } = caller();
    await expect(api.localAuth.resetPassword({ token: "a".repeat(43), password: "new secure password" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(res.cookie).not.toHaveBeenCalled();
  });
});
