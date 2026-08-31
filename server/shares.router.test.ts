import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const shareMocks = vi.hoisted(() => ({ createReportShare: vi.fn(), getSharedReport: vi.fn(), listReportShares: vi.fn(), revokeReportShare: vi.fn() }));
vi.mock("./shareDb", () => shareMocks);

import { appRouter } from "./routers";

const owner = { id: 9, openId: "share-owner", name: "Share Owner", email: "owner@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const ownerContext = { user: owner, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const guestContext = { user: null, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;

describe("shared-report routes", () => {
  it("creates an owner-scoped share, exposes it read-only to guests, and revokes it for its owner", async () => {
    shareMocks.createReportShare.mockResolvedValue({ id: 4, token: "0123456789abcdefghij0123456789abcd", expiresAt: new Date("2026-09-01") });
    shareMocks.getSharedReport.mockResolvedValue({ project: { name: "Research", description: "" }, reportScope: "both", expiresAt: new Date("2026-09-01"), flows: [{ id: 2, nodes: [], edges: [] }], requirements: [{ id: 3, statement: "Requirement" }] });
    const ownerCaller = appRouter.createCaller(ownerContext); const guestCaller = appRouter.createCaller(guestContext);
    const share = await ownerCaller.shares.create({ projectId: 7, reportScope: "both", expiresInDays: 14 });
    const publicReport = await guestCaller.shares.get({ token: share.token });
    await ownerCaller.shares.revoke({ shareId: share.id });
    expect(shareMocks.createReportShare).toHaveBeenCalledWith(7, 9, "both", 14);
    expect(publicReport.flows).toHaveLength(1);
    expect(publicReport.requirements).toHaveLength(1);
    expect(shareMocks.revokeReportShare).toHaveBeenCalledWith(4, 9);
  });

  it("rejects expired or revoked links for guests", async () => {
    shareMocks.getSharedReport.mockRejectedValue(new Error("This shared report is unavailable or has expired."));
    const guestCaller = appRouter.createCaller(guestContext);
    await expect(guestCaller.shares.get({ token: "0123456789abcdefghij0123456789abcd" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
