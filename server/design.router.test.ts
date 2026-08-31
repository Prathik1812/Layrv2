import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const designMocks = vi.hoisted(() => ({
  getProjectDesign: vi.fn(),
  replaceProjectDesign: vi.fn(),
  updateFlowLayout: vi.fn(),
  updateFlowPosition: vi.fn(),
  updateIaLayout: vi.fn(),
  updateIaPosition: vi.fn(),
  generateDesignFromEvidence: vi.fn(),
  listEvidenceForProject: vi.fn(),
}));

vi.mock("./designDb", () => designMocks);
vi.mock("./designGeneration", () => ({ generateDesignFromEvidence: designMocks.generateDesignFromEvidence }));
vi.mock("./db", () => ({ listEvidenceForProject: designMocks.listEvidenceForProject }));

import { appRouter } from "./routers";

const context = {
  user: { id: 17, openId: "canvas-owner", name: "Canvas Owner", email: "owner@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} }, res: {},
} as TrpcContext;

describe("design position mutations", () => {
  it("stores IA and flow drag positions under the current user", async () => {
    const caller = appRouter.createCaller(context);
    await caller.design.moveIaNode({ nodeId: 11, position: { x: 240, y: 160 } });
    await caller.design.moveFlowNode({ nodeId: 12, position: { x: 480, y: 320 } });
    await caller.design.setIaLayout({ positions: [{ nodeId: 11, position: { x: 120, y: 80 } }, { nodeId: 13, position: { x: 360, y: 80 } }] });
    await caller.design.setFlowLayout({ positions: [{ nodeId: 12, position: { x: 300, y: 160 } }, { nodeId: 14, position: { x: 540, y: 160 } }] });
    expect(designMocks.updateIaPosition).toHaveBeenCalledWith(11, 17, { x: 240, y: 160 });
    expect(designMocks.updateFlowPosition).toHaveBeenCalledWith(12, 17, { x: 480, y: 320 });
    expect(designMocks.updateIaLayout).toHaveBeenCalledWith([{ nodeId: 11, position: { x: 120, y: 80 } }, { nodeId: 13, position: { x: 360, y: 80 } }], 17);
    expect(designMocks.updateFlowLayout).toHaveBeenCalledWith([{ nodeId: 12, position: { x: 300, y: 160 } }, { nodeId: 14, position: { x: 540, y: 160 } }], 17);
  });

  it("surfaces an actionable flow-generation error instead of persisting incomplete output", async () => {
    designMocks.listEvidenceForProject.mockResolvedValue([{ id: 1, title: "Observed friction", source: "Interview", sourceType: "Interview", rawText: "Users cannot continue.", tags: [] }]);
    designMocks.generateDesignFromEvidence.mockRejectedValue(new Error("The generated flow “Primary journey” is incomplete (missing end_failure). Please generate again."));
    const caller = appRouter.createCaller(context);
    await expect(caller.design.generate({ projectId: 2 })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: expect.stringContaining("incomplete") });
    expect(designMocks.replaceProjectDesign).not.toHaveBeenCalled();
  });
});
