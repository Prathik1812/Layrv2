import { and, asc, eq } from "drizzle-orm";
import { featureCandidates, requirements } from "../drizzle/schema";
import { getDb, getProjectForUser } from "./db";
import type { GeneratedFeaturePipeline } from "./featureGeneration";

async function requireDb() { const db = await getDb(); if (!db) throw new Error("Database connection is unavailable."); return db; }
async function assertProject(projectId: number, userId: number) { const project = await getProjectForUser(projectId, userId); if (!project) throw new Error("Project not found or access denied."); }
function insertId(result: unknown) { return Number((result as [{ insertId: number }])[0].insertId); }

export async function getFeaturePipeline(projectId: number, userId: number) {
  const db = await requireDb(); await assertProject(projectId, userId);
  const features = await db.select().from(featureCandidates).where(and(eq(featureCandidates.projectId, projectId), eq(featureCandidates.userId, userId))).orderBy(asc(featureCandidates.createdAt));
  const projectRequirements = await db.select().from(requirements).where(and(eq(requirements.projectId, projectId), eq(requirements.userId, userId))).orderBy(asc(requirements.createdAt));
  return { features: features.map(feature => ({ ...feature, requirements: projectRequirements.filter(item => item.featureId === feature.id) })), requirements: projectRequirements };
}

export async function replaceFeaturePipeline(projectId: number, userId: number, pipeline: GeneratedFeaturePipeline) {
  const db = await requireDb(); await assertProject(projectId, userId);
  await db.transaction(async tx => {
    await tx.delete(requirements).where(and(eq(requirements.projectId, projectId), eq(requirements.userId, userId)));
    await tx.delete(featureCandidates).where(and(eq(featureCandidates.projectId, projectId), eq(featureCandidates.userId, userId)));
    for (const feature of pipeline.features) {
      const result = await tx.insert(featureCandidates).values({ projectId, userId, title: feature.title, rationale: feature.rationale, evidenceIds: feature.evidenceIds, selected: 0 });
      const featureId = insertId(result);
      for (const requirement of feature.requirements) await tx.insert(requirements).values({ projectId, userId, featureId, requirementType: requirement.requirementType, statement: requirement.statement, userStory: requirement.userStory, acceptanceCriteria: requirement.acceptanceCriteria, evidenceIds: requirement.evidenceIds, status: "draft" });
    }
  });
  return getFeaturePipeline(projectId, userId);
}

export async function setFeatureSelected(featureId: number, userId: number, selected: boolean) {
  const db = await requireDb(); const record = await db.select().from(featureCandidates).where(and(eq(featureCandidates.id, featureId), eq(featureCandidates.userId, userId))).limit(1); if (!record[0]) throw new Error("Feature not found or access denied."); await assertProject(record[0].projectId, userId); await db.update(featureCandidates).set({ selected: selected ? 1 : 0, updatedAt: new Date() }).where(and(eq(featureCandidates.id, featureId), eq(featureCandidates.userId, userId))); return { success: true as const };
}

export async function updateRequirementForUser(input: { id: number; userId: number; statement: string; userStory: string; acceptanceCriteria: string[]; status: string }) {
  const db = await requireDb(); const record = await db.select().from(requirements).where(and(eq(requirements.id, input.id), eq(requirements.userId, input.userId))).limit(1); if (!record[0]) throw new Error("Requirement not found or access denied."); await assertProject(record[0].projectId, input.userId); await db.update(requirements).set({ statement: input.statement, userStory: input.userStory, acceptanceCriteria: input.acceptanceCriteria, status: input.status, updatedAt: new Date() }).where(and(eq(requirements.id, input.id), eq(requirements.userId, input.userId))); return { success: true as const };
}
