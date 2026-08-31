import { describe, expect, it } from "vitest";
import { isActiveShare } from "./shareDb";

describe("shared report lifecycle", () => {
  it("only treats unrevoked, unexpired links as active", () => {
    const now = new Date("2026-08-26T00:00:00.000Z");
    expect(isActiveShare({ revokedAt: null, expiresAt: new Date("2026-08-27T00:00:00.000Z") }, now)).toBe(true);
    expect(isActiveShare({ revokedAt: new Date(), expiresAt: new Date("2026-08-27T00:00:00.000Z") }, now)).toBe(false);
    expect(isActiveShare({ revokedAt: null, expiresAt: new Date("2026-08-25T00:00:00.000Z") }, now)).toBe(false);
  });
});
