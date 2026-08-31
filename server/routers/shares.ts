import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createReportShare, getSharedReport, listReportShares, revokeReportShare } from "../shareDb";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

function failure(error: unknown) { const message = error instanceof Error ? error.message : "The shared report could not be completed."; return new TRPCError({ code: message.includes("unavailable") || message.includes("not found") || message.includes("access denied") ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR", message }); }

export const sharesRouter = router({
  create: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), reportScope: z.enum(["flows", "requirements", "both"]).default("both"), expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(14), z.literal(30)]).default(14) })).mutation(async ({ ctx, input }) => { try { return await createReportShare(input.projectId, ctx.user.id, input.reportScope, input.expiresInDays); } catch (error) { throw failure(error); } }),
  list: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => { try { return await listReportShares(input.projectId, ctx.user.id); } catch (error) { throw failure(error); } }),
  revoke: protectedProcedure.input(z.object({ shareId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { try { await revokeReportShare(input.shareId, ctx.user.id); return { success: true as const }; } catch (error) { throw failure(error); } }),
  get: publicProcedure.input(z.object({ token: z.string().min(20).max(96) })).query(async ({ input }) => { try { return await getSharedReport(input.token); } catch (error) { throw failure(error); } }),
});
