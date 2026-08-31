import { eq } from "drizzle-orm";
import { projects, users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { appRouter } from "../server/routers.ts";

const db = await getDb();
if (!db) throw new Error("Database connection is unavailable for router verification.");
const project = (await db.select().from(projects).where(eq(projects.id, 1)).limit(1))[0];
if (!project) throw new Error("Project 1 is unavailable for router verification.");
const user = (await db.select().from(users).where(eq(users.id, project.userId)).limit(1))[0];
if (!user) throw new Error("Project owner is unavailable for router verification.");

const caller = appRouter.createCaller({ user, req: { protocol: "http", headers: {} }, res: {} });
const design = await caller.design.generate({ projectId: project.id });
const primaryFlow = design.flows[0];
if (!primaryFlow || primaryFlow.nodes.length < 5 || primaryFlow.edges.length < 4) throw new Error("Router generation persisted an incomplete flow.");
console.log(JSON.stringify({ projectId: project.id, flowCount: design.flows.length, primaryFlow: primaryFlow.name, nodeCount: primaryFlow.nodes.length, edgeCount: primaryFlow.edges.length, storyboardPanelCount: design.storyboard.length }));
