import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const anonymousContext = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

describe("research routes", () => {
  it("requires authentication before reading user-scoped projects", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.projects.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires authentication before reading user-scoped evidence", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.evidence.list({ projectId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires authentication before reading saved flow outputs", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.workflow.list({ projectId: 1, outputType: "flow" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires authentication before reading evidence-derived design artifacts", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.design.get({ projectId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires authentication before reading evidence-backed feature candidates", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.features.get({ projectId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
