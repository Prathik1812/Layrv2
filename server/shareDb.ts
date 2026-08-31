import { and, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { flowEdges, flowNodes, flows, projects, requirements, sharedReports } from "../drizzle/schema";
import { getDb, getProjectForUser } from "./db";

async function requireDb() { const db = await getDb(); if (!db) throw new Error("Database connection is unavailable."); return db; }

export function isActiveShare(share: { expiresAt: Date | null; revokedAt: Date | null }, now = new Date()) { return !share.revokedAt && (!share.expiresAt || share.expiresAt > now); }

export async function createReportShare(projectId: number, userId: number, reportScope: "flows" | "requirements" | "both", expiresInDays: number) {
  const db = await requireDb(); await getProjectForUser(projectId, userId).then(project => { if (!project) throw new Error("Project not found or access denied."); });
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const result = await db.insert(sharedReports).values({ projectId, userId, token: nanoid(32), reportScope, expiresAt });
  const id = Number(result[0].insertId); return (await db.select().from(sharedReports).where(eq(sharedReports.id, id)).limit(1))[0];
}

export async function revokeReportShare(shareId: number, userId: number) {
  const db = await requireDb(); const share = (await db.select().from(sharedReports).where(and(eq(sharedReports.id, shareId), eq(sharedReports.userId, userId))).limit(1))[0];
  if (!share) throw new Error("Shared report not found or access denied.");
  await db.update(sharedReports).set({ revokedAt: new Date() }).where(eq(sharedReports.id, shareId));
}

export async function listReportShares(projectId: number, userId: number) { const db = await requireDb(); await getProjectForUser(projectId, userId).then(project => { if (!project) throw new Error("Project not found or access denied."); }); return db.select().from(sharedReports).where(and(eq(sharedReports.projectId, projectId), eq(sharedReports.userId, userId))); }

export async function getSharedReport(token: string) {
  const db = await requireDb(); const share = (await db.select().from(sharedReports).where(and(eq(sharedReports.token, token), isNull(sharedReports.revokedAt), gt(sharedReports.expiresAt, new Date()))).limit(1))[0];
  if (!share) throw new Error("This shared report is unavailable or has expired.");
  const project = (await db.select().from(projects).where(eq(projects.id, share.projectId)).limit(1))[0]; if (!project) throw new Error("This shared report is unavailable or has expired.");
  const projectFlows = share.reportScope === "requirements" ? [] : await db.select().from(flows).where(eq(flows.projectId, share.projectId));
  const flowIds = projectFlows.map(flow => flow.id); const nodes = flowIds.length ? await db.select().from(flowNodes).where(eq(flowNodes.userId, share.userId)) : []; const edges = flowIds.length ? await db.select().from(flowEdges).where(eq(flowEdges.userId, share.userId)) : [];
  const projectRequirements = share.reportScope === "flows" ? [] : await db.select().from(requirements).where(eq(requirements.projectId, share.projectId));
  return { project: { name: project.name, description: project.description }, reportScope: share.reportScope, expiresAt: share.expiresAt, flows: projectFlows.map(flow => ({ ...flow, nodes: nodes.filter(node => node.flowId === flow.id), edges: edges.filter(edge => edge.flowId === flow.id) })), requirements: projectRequirements };
}
