import { and, asc, eq } from "drizzle-orm";
import ELK from "elkjs/lib/elk.bundled.js";
import { flowEdges, flowNodes, flows, gapFlags, iaEdges, iaNodes, storyboardPanels } from "../drizzle/schema";
import type { GeneratedDesign } from "./designGeneration";
import { extractInsertId, getDb, getProjectForUser } from "./db";

const elk = new ELK();

async function generatedLayout(nodes: Array<{ clientId: string }>, edges: Array<{ fromClientId: string; toClientId: string }>, kind: "ia" | "flow") {
  try {
    const dimensions = kind === "ia" ? { width: 172, height: 66 } : { width: 188, height: 104 };
    const graph = await elk.layout({ id: "root", layoutOptions: { "elk.algorithm": "layered", "elk.direction": "RIGHT", "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX", "elk.spacing.nodeNode": kind === "flow" ? "42" : "70", "elk.layered.spacing.nodeNodeBetweenLayers": kind === "flow" ? "54" : "120" }, children: nodes.map(node => ({ id: node.clientId, ...dimensions })), edges: edges.map(edge => ({ id: `${edge.fromClientId}:${edge.toClientId}`, sources: [edge.fromClientId], targets: [edge.toClientId] })) });
    return new Map((graph.children ?? []).map(node => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]));
  } catch (error) {
    console.warn("[Design] ELK layout failed; client will repair positions:", error);
    return new Map<string, { x: number; y: number }>();
  }
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable.");
  return db;
}

async function assertProject(projectId: number, userId: number) {
  const project = await getProjectForUser(projectId, userId);
  if (!project) throw new Error("Project not found or access denied.");
}

function insertId(result: unknown) {
  return extractInsertId(result);
}

export async function getProjectDesign(projectId: number, userId: number) {
  const db = await requireDb();
  await assertProject(projectId, userId);
  const [architectureNodes, architectureEdges, projectFlows, panels, gaps] = await Promise.all([
    db.select().from(iaNodes).where(and(eq(iaNodes.projectId, projectId), eq(iaNodes.userId, userId))),
    db.select().from(iaEdges).where(and(eq(iaEdges.projectId, projectId), eq(iaEdges.userId, userId))),
    db.select().from(flows).where(and(eq(flows.projectId, projectId), eq(flows.userId, userId))),
    db.select().from(storyboardPanels).where(and(eq(storyboardPanels.projectId, projectId), eq(storyboardPanels.userId, userId))).orderBy(asc(storyboardPanels.orderIndex)),
    db.select().from(gapFlags).where(and(eq(gapFlags.projectId, projectId), eq(gapFlags.userId, userId))),
  ]);
  const flowIds = projectFlows.map(flow => flow.id);
  let allNodes = flowIds.length ? await db.select().from(flowNodes).where(eq(flowNodes.userId, userId)) : [];
  const allEdges = flowIds.length ? await db.select().from(flowEdges).where(eq(flowEdges.userId, userId)) : [];
  const repairedGroups = await Promise.all(projectFlows.map(async flow => {
    const nodes = allNodes.filter(node => node.flowId === flow.id);
    const zeroPositions = nodes.filter(node => node.position.x === 0 && node.position.y === 0).length;
    if (!nodes.length || zeroPositions <= nodes.length / 2) return nodes;
    const edges = allEdges.filter(edge => edge.flowId === flow.id);
    const positions = await generatedLayout(nodes.map(node => ({ clientId: String(node.id) })), edges.map(edge => ({ fromClientId: String(edge.fromNodeId), toClientId: String(edge.toNodeId) })), "flow");
    await db.transaction(async tx => { for (const node of nodes) { const position = positions.get(String(node.id)) ?? node.position; await tx.update(flowNodes).set({ position, updatedAt: new Date() }).where(and(eq(flowNodes.id, node.id), eq(flowNodes.userId, userId))); } });
    return nodes.map(node => ({ ...node, position: positions.get(String(node.id)) ?? node.position }));
  }));
  allNodes = repairedGroups.flat();
  return {
    iaNodes: architectureNodes,
    iaEdges: architectureEdges,
    flows: projectFlows.map(flow => ({ ...flow, nodes: allNodes.filter(node => node.flowId === flow.id), edges: allEdges.filter(edge => edge.flowId === flow.id) })),
    storyboard: panels,
    gaps,
  };
}

export async function replaceProjectDesign(projectId: number, userId: number, design: GeneratedDesign) {
  const db = await requireDb();
  await assertProject(projectId, userId);
  await db.transaction(async tx => {
    await tx.delete(gapFlags).where(and(eq(gapFlags.projectId, projectId), eq(gapFlags.userId, userId)));
    await tx.delete(storyboardPanels).where(and(eq(storyboardPanels.projectId, projectId), eq(storyboardPanels.userId, userId)));
    const existingFlows = await tx.select({ id: flows.id }).from(flows).where(and(eq(flows.projectId, projectId), eq(flows.userId, userId)));
    for (const flow of existingFlows) {
      await tx.delete(flowEdges).where(eq(flowEdges.flowId, flow.id));
      await tx.delete(flowNodes).where(eq(flowNodes.flowId, flow.id));
    }
    await tx.delete(flows).where(and(eq(flows.projectId, projectId), eq(flows.userId, userId)));
    await tx.delete(iaEdges).where(and(eq(iaEdges.projectId, projectId), eq(iaEdges.userId, userId)));
    await tx.delete(iaNodes).where(and(eq(iaNodes.projectId, projectId), eq(iaNodes.userId, userId)));

    const iaMap = new Map<string, number>();
    const iaPositions = await generatedLayout(design.ia.nodes, design.ia.edges, "ia");
    for (const node of design.ia.nodes) {
      const result = await tx.insert(iaNodes).values({ projectId, userId, parentId: null, label: node.label, nodeType: node.nodeType, position: iaPositions.get(node.clientId) ?? { x: 0, y: 0 }, linkedEvidenceIds: node.linkedEvidenceIds });
      iaMap.set(node.clientId, insertId(result));
    }
    for (const node of design.ia.nodes) {
      const parentId = iaMap.get(node.parentClientId);
      const nodeId = iaMap.get(node.clientId);
      if (nodeId && parentId) await tx.update(iaNodes).set({ parentId }).where(eq(iaNodes.id, nodeId));
    }
    for (const edge of design.ia.edges) {
      const fromNodeId = iaMap.get(edge.fromClientId); const toNodeId = iaMap.get(edge.toClientId);
      if (fromNodeId && toNodeId) await tx.insert(iaEdges).values({ projectId, userId, fromNodeId, toNodeId, edgeType: edge.edgeType });
    }

    const flowMap = new Map<string, number>();
    const flowNodeMap = new Map<string, number>();
    for (const flow of design.flows) {
      const flowPositions = await generatedLayout(flow.nodes, flow.edges, "flow");
      const flowResult = await tx.insert(flows).values({ projectId, userId, name: flow.name, description: flow.description, linkedEvidenceIds: flow.linkedEvidenceIds });
      const flowId = insertId(flowResult); flowMap.set(flow.clientId, flowId);
      for (const node of flow.nodes) {
        const nodeResult = await tx.insert(flowNodes).values({ flowId, userId, nodeType: node.nodeType, label: node.label, trigger: node.trigger, dataInvolved: node.dataInvolved, position: flowPositions.get(node.clientId) ?? { x: 0, y: 0 }, linkedEvidenceIds: node.linkedEvidenceIds });
        flowNodeMap.set(`${flow.clientId}:${node.clientId}`, insertId(nodeResult));
      }
      for (const edge of flow.edges) {
        const fromNodeId = flowNodeMap.get(`${flow.clientId}:${edge.fromClientId}`); const toNodeId = flowNodeMap.get(`${flow.clientId}:${edge.toClientId}`);
        if (fromNodeId && toNodeId) await tx.insert(flowEdges).values({ flowId, userId, fromNodeId, toNodeId, conditionLabel: edge.conditionLabel });
      }
    }
    for (const panel of design.storyboard) {
      const flowId = flowMap.get(panel.flowClientId); const linkedFlowNodeId = flowNodeMap.get(`${panel.flowClientId}:${panel.linkedFlowNodeClientId}`) ?? null;
      if (flowId) await tx.insert(storyboardPanels).values({ projectId, userId, flowId, linkedFlowNodeId, orderIndex: panel.orderIndex, caption: panel.caption, linkedEvidenceIds: panel.linkedEvidenceIds });
    }
    for (const gap of design.gaps) {
      const linkedEntityId = iaMap.get(gap.linkedEntityClientId) ?? flowMap.get(gap.linkedEntityClientId) ?? Array.from(flowNodeMap.entries()).find(([key]) => key.endsWith(`:${gap.linkedEntityClientId}`))?.[1] ?? (Number(gap.linkedEntityClientId) || null);
      await tx.insert(gapFlags).values({ projectId, userId, flagType: gap.flagType, title: gap.title, description: gap.description, whyItMatters: gap.whyItMatters, severity: gap.severity, linkedEntityType: gap.linkedEntityType, linkedEntityId });
    }
  });
  return getProjectDesign(projectId, userId);
}

export async function updateIaPosition(nodeId: number, userId: number, position: { x: number; y: number }) {
  const db = await requireDb();
  await db.update(iaNodes).set({ position, updatedAt: new Date() }).where(and(eq(iaNodes.id, nodeId), eq(iaNodes.userId, userId)));
}

export async function updateIaLayout(positions: Array<{ nodeId: number; position: { x: number; y: number } }>, userId: number) {
  const db = await requireDb();
  await db.transaction(async tx => { for (const item of positions) await tx.update(iaNodes).set({ position: item.position, updatedAt: new Date() }).where(and(eq(iaNodes.id, item.nodeId), eq(iaNodes.userId, userId))); });
}

export async function updateFlowPosition(nodeId: number, userId: number, position: { x: number; y: number }) {
  const db = await requireDb();
  await db.update(flowNodes).set({ position, updatedAt: new Date() }).where(and(eq(flowNodes.id, nodeId), eq(flowNodes.userId, userId)));
}

export async function updateFlowLayout(positions: Array<{ nodeId: number; position: { x: number; y: number } }>, userId: number) {
  const db = await requireDb();
  await db.transaction(async tx => { for (const item of positions) await tx.update(flowNodes).set({ position: item.position, updatedAt: new Date() }).where(and(eq(flowNodes.id, item.nodeId), eq(flowNodes.userId, userId))); });
}

export async function updateStoryboardThumbnail(panelId: number, userId: number, thumbnailUrl: string | null, thumbnailState: "idle" | "generating" | "ready" | "failed") {
  const db = await requireDb();
  await db.update(storyboardPanels).set({ thumbnailUrl, thumbnailState }).where(and(eq(storyboardPanels.id, panelId), eq(storyboardPanels.userId, userId)));
}
