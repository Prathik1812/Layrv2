import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  ensureDevelopmentPreviewProject: vi.fn(),
  listProjectsForUser: vi.fn(),
  listEvidenceForProject: vi.fn(),
}));

vi.mock("./sdk", () => ({ sdk: { authenticateRequest: mocks.authenticateRequest } }));
vi.mock("../db", () => ({
  upsertUser: mocks.upsertUser,
  getUserByOpenId: mocks.getUserByOpenId,
  ensureDevelopmentPreviewProject: mocks.ensureDevelopmentPreviewProject,
  listProjectsForUser: mocks.listProjectsForUser,
  listEvidenceForProject: mocks.listEvidenceForProject,
}));

import { createContext } from "./context";
import { appRouter } from "../routers";

const originalNodeEnv = process.env.NODE_ENV;
const previewUser = { id: 77, openId: "layr-development-preview", name: "Preview Researcher", email: "preview@local.layr", loginMethod: "development-preview", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

function previewRequest() { return { headers: { "x-layr-preview": "enabled" }, protocol: "http" } as never; }

describe("preview context workspace access", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.NODE_ENV = "development"; mocks.authenticateRequest.mockRejectedValue(new Error("OAuth unavailable")); mocks.getUserByOpenId.mockResolvedValue(previewUser); mocks.ensureDevelopmentPreviewProject.mockResolvedValue({ id: 1, userId: 77 }); mocks.listProjectsForUser.mockResolvedValue([]); mocks.listEvidenceForProject.mockResolvedValue([]); });
  afterEach(() => { process.env.NODE_ENV = originalNodeEnv; });

  it("resolves the preview header into a development user", async () => {
    const context = await createContext({ req: previewRequest(), res: {} as never } as never);
    expect(context.user).toMatchObject({ id: 77, openId: "layr-development-preview" });
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "layr-development-preview" }));
    expect(mocks.ensureDevelopmentPreviewProject).toHaveBeenCalledWith(77);
  });

  it("uses the real preview context for protected projects and evidence procedures", async () => {
    const context = await createContext({ req: previewRequest(), res: {} as never } as never);
    const caller = appRouter.createCaller(context);
    await expect(caller.projects.list()).resolves.toEqual([]);
    await expect(caller.evidence.list({ projectId: 1 })).resolves.toEqual([]);
    expect(mocks.listProjectsForUser).toHaveBeenCalledWith(77);
    expect(mocks.listEvidenceForProject).toHaveBeenCalledWith(1, 77);
  });
});
