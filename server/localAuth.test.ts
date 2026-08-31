import { describe, expect, it } from "vitest";
import {
  createLocalSessionToken,
  createResetToken,
  hashPassword,
  hashResetToken,
  normalizeEmail,
  verifyLocalSessionToken,
  verifyPassword,
} from "./localAuth";

describe("local authentication primitives", () => {
  it("normalizes email and stores only a salted one-way password representation", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPassword(password);
    expect(normalizeEmail("  RESEARCHER@Example.com ")).toBe("researcher@example.com");
    expect(hash).not.toContain(password);
    expect(hash.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("creates opaque one-way reset-token records", async () => {
    const token = createResetToken();
    const hash = await hashResetToken(token);
    expect(token).toHaveLength(43);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
  });

  it("issues signed local sessions bound to the credential session version", async () => {
    const token = await createLocalSessionToken({ userId: 42, sessionVersion: 3 });
    await expect(verifyLocalSessionToken(token)).resolves.toEqual({ userId: 42, sessionVersion: 3 });
    await expect(verifyLocalSessionToken(`${token}tampered`)).resolves.toBeNull();
  });
});
