import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  addAttachmentForUser: vi.fn(),
  createEvidenceForUser: vi.fn(),
  createProjectForUser: vi.fn(),
  createSynthesisForUser: vi.fn(),
  createWorkflowOutputForUser: vi.fn(),
  deleteAttachmentForUser: vi.fn(),
  deleteEvidenceForUser: vi.fn(),
  getEvidenceForUser: vi.fn(),
  getProjectForUser: vi.fn(),
  listEvidenceForProject: vi.fn(),
  listOutputsForProject: vi.fn(),
  listProjectsForUser: vi.fn(),
  updateEvidenceForUser: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./researchSynthesis", () => ({ synthesizeEvidence: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./pdfText", () => ({ extractPdfText: vi.fn(), isPdfUpload: vi.fn() }));

import { appRouter } from "./routers";

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "owner-42",
      name: "Research Owner",
      email: "owner@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("research routers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only the current user's projects", async () => {
    dbMocks.listProjectsForUser.mockResolvedValue([]);
    const caller = appRouter.createCaller(createUserContext());

    await caller.projects.list();

    expect(dbMocks.listProjectsForUser).toHaveBeenCalledWith(42);
  });

  it("allows a development preview identity through protected project access", async () => {
    dbMocks.listProjectsForUser.mockResolvedValue([]);
    const context = createUserContext();
    context.user = { ...context.user!, id: 77, openId: "layr-development-preview", name: "Preview Researcher", loginMethod: "development-preview" };
    const caller = appRouter.createCaller(context);

    await expect(caller.projects.list()).resolves.toEqual([]);
    expect(dbMocks.listProjectsForUser).toHaveBeenCalledWith(77);
  });

  it("stamps the signed-in user onto new evidence before persistence", async () => {
    dbMocks.createEvidenceForUser.mockResolvedValue({ id: 7, title: "Observed friction" });
    const caller = appRouter.createCaller(createUserContext());

    await caller.evidence.create({
      projectId: 9,
      title: "Observed friction",
      source: "Research interview #3",
      sourceType: "Interview",
      rawText: "I could not find the setting I needed.",
      tags: ["navigation", "settings"],
      status: "unreviewed",
    });

    expect(dbMocks.createEvidenceForUser).toHaveBeenCalledWith({
      projectId: 9,
      userId: 42,
      title: "Observed friction",
      source: "Research interview #3",
      sourceType: "Interview",
      rawText: "I could not find the setting I needed.",
      tags: ["navigation", "settings"],
      status: "unreviewed",
    });
  });
});
