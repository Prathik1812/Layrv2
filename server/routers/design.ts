import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getProjectDesign, replaceProjectDesign, updateFlowLayout, updateFlowPosition, updateIaLayout, updateIaPosition } from "../designDb";
import { generateDesignFromEvidence } from "../designGeneration";
import { generateStoryboardThumbnails } from "../storyboardThumbnails";
import { listEvidenceForProject } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const positionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });

function toTrpcError(error: unknown) {
  const message = error instanceof Error ? error.message : "The design pipeline could not be completed.";
  if (message.includes("not found") || message.includes("access denied")) return new TRPCError({ code: "NOT_FOUND", message: "This project is unavailable." });
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}

export const designRouter = router({
  get: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    try { return await getProjectDesign(input.projectId, ctx.user.id); } catch (error) { throw toTrpcError(error); }
  }),
  generate: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try {
      const evidence = await listEvidenceForProject(input.projectId, ctx.user.id);
      const design = await generateDesignFromEvidence(evidence.map(item => ({ id: item.id, title: item.title, source: item.source, sourceType: item.sourceType, rawText: item.rawText, tags: item.tags })));
      return await replaceProjectDesign(input.projectId, ctx.user.id, design);
    } catch (error) { throw toTrpcError(error); }
  }),
  generateStoryboardThumbnails: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try { return await generateStoryboardThumbnails(input.projectId, ctx.user.id); } catch (error) { throw toTrpcError(error); }
  }),
  moveIaNode: protectedProcedure.input(z.object({ nodeId: z.number().int().positive(), position: positionSchema })).mutation(async ({ ctx, input }) => {
    try { await updateIaPosition(input.nodeId, ctx.user.id, input.position); return { success: true as const }; } catch (error) { throw toTrpcError(error); }
  }),
  setIaLayout: protectedProcedure.input(z.object({ positions: z.array(z.object({ nodeId: z.number().int().positive(), position: positionSchema })).min(1).max(100) })).mutation(async ({ ctx, input }) => {
    try { await updateIaLayout(input.positions, ctx.user.id); return { success: true as const }; } catch (error) { throw toTrpcError(error); }
  }),
  moveFlowNode: protectedProcedure.input(z.object({ nodeId: z.number().int().positive(), position: positionSchema })).mutation(async ({ ctx, input }) => {
    try { await updateFlowPosition(input.nodeId, ctx.user.id, input.position); return { success: true as const }; } catch (error) { throw toTrpcError(error); }
  }),
  setFlowLayout: protectedProcedure.input(z.object({ positions: z.array(z.object({ nodeId: z.number().int().positive(), position: positionSchema })).min(1).max(100) })).mutation(async ({ ctx, input }) => {
    try { await updateFlowLayout(input.positions, ctx.user.id); return { success: true as const }; } catch (error) { throw toTrpcError(error); }
  }),
});
