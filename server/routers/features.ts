import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getFeaturePipeline, replaceFeaturePipeline, setFeatureSelected, updateRequirementForUser } from "../featureDb";
import { generateFeaturesFromEvidence } from "../featureGeneration";
import { listEvidenceForProject } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

function fail(error: unknown) { const message = error instanceof Error ? error.message : "The feature pipeline could not be completed."; if (message.includes("not found") || message.includes("access denied")) return new TRPCError({ code: "NOT_FOUND", message: "This project content is unavailable." }); return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message }); }

export const featuresRouter = router({
  get: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => { try { return await getFeaturePipeline(input.projectId, ctx.user.id); } catch (error) { throw fail(error); } }),
  generate: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { try { const evidence = await listEvidenceForProject(input.projectId, ctx.user.id); const pipeline = await generateFeaturesFromEvidence(evidence.map(item => ({ id: item.id, title: item.title, source: item.source, sourceType: item.sourceType, rawText: item.rawText, tags: item.tags }))); return await replaceFeaturePipeline(input.projectId, ctx.user.id, pipeline); } catch (error) { throw fail(error); } }),
  setSelected: protectedProcedure.input(z.object({ featureId: z.number().int().positive(), selected: z.boolean() })).mutation(async ({ ctx, input }) => { try { return await setFeatureSelected(input.featureId, ctx.user.id, input.selected); } catch (error) { throw fail(error); } }),
  updateRequirement: protectedProcedure.input(z.object({ id: z.number().int().positive(), statement: z.string().min(1).max(10000), userStory: z.string().min(1).max(10000), acceptanceCriteria: z.array(z.string().min(1).max(1000)).min(1).max(20), status: z.enum(["draft", "reviewed", "approved"]) })).mutation(async ({ ctx, input }) => { try { return await updateRequirementForUser({ ...input, userId: ctx.user.id }); } catch (error) { throw fail(error); } }),
});
