import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addAttachmentForUser,
  createEvidenceForUser,
  createProjectForUser,
  createSynthesisForUser,
  createWorkflowOutputForUser,
  deleteAttachmentForUser,
  deleteEvidenceForUser,
  getEvidenceForUser,
  getProjectForUser,
  listEvidenceForProject,
  listOutputsForProject,
  listProjectsForUser,
  updateEvidenceForUser,
} from "../db";
import { extractPdfText, isPdfUpload } from "../pdfText";
import { extractDocxText, isDocxUpload } from "../docxText";
import { synthesizeEvidence } from "../researchSynthesis";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

const evidenceFields = {
  title: z.string().trim().min(1).max(220),
  source: z.string().trim().min(1).max(220),
  sourceType: z.string().trim().min(1).max(48),
  rawText: z.string().trim().min(1).max(30000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  status: z.enum(["unreviewed", "reviewed", "synthesized"]),
};

function translateError(error: unknown) {
  const message = error instanceof Error ? error.message : "The request could not be completed.";
  if (message.includes("access denied") || message.includes("not found")) {
    return new TRPCError({ code: "NOT_FOUND", message: "This item is unavailable." });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => listProjectsForUser(ctx.user.id)),
  create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      try { return await createProjectForUser(ctx.user.id, input.name, input.description); }
      catch (error) { throw translateError(error); }
    }),
  get: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    try {
      const project = await getProjectForUser(input.projectId, ctx.user.id);
      if (!project) throw new Error("Project not found or access denied.");
      return project;
    } catch (error) { throw translateError(error); }
  }),
});

export const evidenceRouter = router({
  list: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    try { return await listEvidenceForProject(input.projectId, ctx.user.id); }
    catch (error) { throw translateError(error); }
  }),
  create: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), ...evidenceFields }))
    .mutation(async ({ ctx, input }) => {
      try { return await createEvidenceForUser({ ...input, userId: ctx.user.id }); }
      catch (error) { throw translateError(error); }
    }),
  update: protectedProcedure.input(z.object({ id: z.number().int().positive(), ...Object.fromEntries(Object.entries(evidenceFields).map(([key, schema]) => [key, schema.optional()])) }).refine(input => Object.keys(input).some(key => key !== "id"), "Provide at least one field to update."))
    .mutation(async ({ ctx, input }) => {
      try { return await updateEvidenceForUser({ ...input, userId: ctx.user.id }); }
      catch (error) { throw translateError(error); }
    }),
  delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try { await deleteEvidenceForUser(input.id, ctx.user.id); return { success: true as const }; }
    catch (error) { throw translateError(error); }
  }),
  attach: protectedProcedure.input(z.object({ evidenceId: z.number().int().positive(), fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), dataBase64: z.string().min(1).max(7000000) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const fileBuffer = Buffer.from(input.dataBase64, "base64");
        if (!fileBuffer.length || fileBuffer.length > 5000000) throw new Error("Attachments must be smaller than 5 MB.");
        const cleanName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileKey = `research/${ctx.user.id}/evidence/${input.evidenceId}/${Date.now()}-${cleanName}`;
        const { key, url } = await storagePut(fileKey, fileBuffer, input.mimeType);
        const attachment = await addAttachmentForUser({ evidenceId: input.evidenceId, userId: ctx.user.id, fileName: input.fileName, mimeType: input.mimeType, fileKey: key, fileUrl: url, fileSize: fileBuffer.length });
        const isPdf = isPdfUpload(input.fileName, input.mimeType);
        const isDocx = isDocxUpload(input.fileName, input.mimeType);
        const ext = input.fileName.split(".").pop()?.toLowerCase() || "";
        const isPlainText = ["txt", "csv", "md", "json", "log", "tsv"].includes(ext) || input.mimeType.startsWith("text/");
        const isPresentation = ["ppt", "pptx"].includes(ext) || input.mimeType.includes("presentation");

        let extractedText = "";
        try {
          if (isPdf) {
            extractedText = await extractPdfText(fileBuffer);
          } else if (isDocx) {
            extractedText = await extractDocxText(fileBuffer);
          } else if (isPlainText) {
            extractedText = fileBuffer.toString("utf-8").trim();
          } else if (isPresentation) {
            // Extract printable text chunks from presentation binary buffer
            const raw = fileBuffer.toString("utf-8");
            const clean = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
            extractedText = clean.length > 50 ? clean.slice(0, 8000) : "";
          }

          if (!extractedText) {
            return { attachment, extractedTextLength: 0, extractionWarning: null };
          }

          const evidence = await getEvidenceForUser(input.evidenceId, ctx.user.id);
          const marker = `[Extracted from ${input.fileName}]`;
          const rawText = evidence.rawText.includes(marker) ? evidence.rawText : `${evidence.rawText.trim()}\n\n${marker}\n${extractedText}`;
          if (rawText !== evidence.rawText) await updateEvidenceForUser({ id: input.evidenceId, userId: ctx.user.id, rawText });
          return { attachment, extractedTextLength: extractedText.length, extractionWarning: null };
        } catch (extractionError) {
          console.warn("[Evidence] Text extraction warning:", extractionError);
          return { attachment, extractedTextLength: 0, extractionWarning: `Attached file ${input.fileName}, but text extraction could not complete.` };
        }
      } catch (error) { throw translateError(error); }
    }),
  removeAttachment: protectedProcedure.input(z.object({ attachmentId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    try { await deleteAttachmentForUser(input.attachmentId, ctx.user.id); return { success: true as const }; }
    catch (error) { throw translateError(error); }
  }),
});

export const synthesisRouter = router({
  list: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    try { return await listOutputsForProject(input.projectId, ctx.user.id); }
    catch (error) { throw translateError(error); }
  }),
  generate: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), evidenceIds: z.array(z.number().int().positive()).min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const evidence = await listEvidenceForProject(input.projectId, ctx.user.id);
        const selected = evidence.filter(item => input.evidenceIds.includes(item.id));
        if (selected.length !== input.evidenceIds.length) throw new Error("One or more selected evidence items are unavailable.");
        const content = await synthesizeEvidence(selected);
        await Promise.all(selected.map(item => updateEvidenceForUser({ id: item.id, userId: ctx.user.id, status: "synthesized" })));
        return await createSynthesisForUser({ projectId: input.projectId, userId: ctx.user.id, title: `Synthesis · ${new Date().toLocaleDateString()}`, evidenceIds: input.evidenceIds, content: content as unknown as Record<string, unknown> });
      } catch (error) { throw translateError(error); }
  }),
});

export const workflowRouter = router({
  list: protectedProcedure.input(z.object({ projectId: z.number().int().positive(), outputType: z.enum(["flow", "ship"]) }))
    .query(async ({ ctx, input }) => {
      try {
        const outputs = await listOutputsForProject(input.projectId, ctx.user.id);
        return outputs.filter(output => output.outputType === input.outputType);
      } catch (error) { throw translateError(error); }
    }),
  save: protectedProcedure.input(z.object({
    projectId: z.number().int().positive(),
    outputType: z.enum(["flow", "ship"]),
    title: z.string().trim().min(1).max(220),
    summary: z.string().trim().min(1).max(10000),
  })).mutation(async ({ ctx, input }) => {
    try { return await createWorkflowOutputForUser({ ...input, userId: ctx.user.id }); }
    catch (error) { throw translateError(error); }
  }),
});
