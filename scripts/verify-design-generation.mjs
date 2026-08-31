import { eq } from "drizzle-orm";
import { evidenceItems } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { generateDesignFromEvidence } from "../server/designGeneration.ts";

const db = await getDb();
if (!db) throw new Error("Database connection is unavailable for the generation verification.");
const evidence = await db.select().from(evidenceItems).where(eq(evidenceItems.projectId, 1)).limit(1);
if (!evidence[0]) throw new Error("No evidence is available for the generation verification.");

const item = evidence[0];
const design = await generateDesignFromEvidence([{ id: item.id, title: item.title, source: item.source, sourceType: item.sourceType, rawText: item.rawText, tags: item.tags }]);
const primaryFlow = design.flows[0];
if (!primaryFlow || !primaryFlow.nodes.some(node => node.nodeType === "decision") || !primaryFlow.nodes.some(node => node.nodeType === "end_failure")) throw new Error("Generation returned an incomplete flow.");

console.log(JSON.stringify({ flowCount: design.flows.length, primaryFlow: primaryFlow.name, nodeCount: primaryFlow.nodes.length, edgeCount: primaryFlow.edges.length, storyboardPanelCount: design.storyboard.length }));
