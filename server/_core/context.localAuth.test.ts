import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getLocalUserForSession: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  ensureDevelopmentPreviewProject: vi.fn(),
  listProjectsForUser: vi.fn(),
  verifyLocalSessionToken: vi.fn(),
  getCookieValue: vi.fn(),
}));

vi.mock("./sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("../db", () => ({ getLocalUserForSession: mocks.getLocalUserForSession, getUserByOpenId: mocks.getUserByOpenId, upsertUser: mocks.upsertUser, ensureDevelopmentPreviewProject: mocks.ensureDevelopmentPreviewProject, listProjectsForUser: mocks.listProjectsForUser }));
vi.mock("../localAuth", () => ({ LOCAL_AUTH_COOKIE: "layr_local_session", getCookieValue: mocks.getCookieValue, verifyLocalSessionToken: mocks.verifyLocalSessionToken }));

import { createContext } from "./context";
import { appRouter } from "../routers";

const localUser = { id: 34, openId: "local_34", name: "Local Researcher", email: "local@example.com", loginMethod: "email-password", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("local session context", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getCookieValue.mockReturnValue("local-session"); mocks.verifyLocalSessionToken.mockResolvedValue({ userId: 34, sessionVersion: 4 }); mocks.getLocalUserForSession.mockResolvedValue(localUser); mocks.listProjectsForUser.mockResolvedValue([]); });

  it("uses a valid versioned local session before attempting external OAuth authentication", async () => {
    const context = await createContext({ req: { headers: { cookie: "layr_local_session=local-session" }, protocol: "https" }, res: {} } as never);
    expect(context.user).toMatchObject({ id: 34, email: "local@example.com" });
    expect(mocks.getLocalUserForSession).toHaveBeenCalledWith(34, 4);
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
  });

  it("falls back to the existing OAuth path when a local session is absent or stale", async () => {
    mocks.verifyLocalSessionToken.mockResolvedValue(null);
    mocks.authenticateRequest.mockResolvedValue(localUser);
    const context = await createContext({ req: { headers: {}, protocol: "https" }, res: {} } as never);
    expect(context.user).toMatchObject({ id: 34 });
    expect(mocks.authenticateRequest).toHaveBeenCalledTimes(1);
  });

  it("rejects an unverified local session from protected workspace access", async () => {
    mocks.getLocalUserForSession.mockResolvedValue(undefined);
    mocks.authenticateRequest.mockRejectedValue(new Error("No external session"));
    const context = await createContext({ req: { headers: { cookie: "layr_local_session=local-session" }, protocol: "https" }, res: {} } as never);
    expect(context.user).toBeNull();
    await expect(appRouter.createCaller(context).projects.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("permits a verified local session to use protected workspace procedures", async () => {
    const context = await createContext({ req: { headers: { cookie: "layr_local_session=local-session" }, protocol: "https" }, res: {} } as never);
    await expect(appRouter.createCaller(context).projects.list()).resolves.toEqual([]);
    expect(mocks.listProjectsForUser).toHaveBeenCalledWith(34);
  });
});
