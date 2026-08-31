import type { CanvasItem, CanvasLink } from "@/components/DesignCanvas";

export type PersistedFlowForCanvas = {
  nodes: Array<{ id: number; label: string; nodeType: string; position: { x: number; y: number }; linkedEvidenceIds: number[]; trigger: string; dataInvolved: string }>;
  edges: Array<{ id: number; fromNodeId: number; toNodeId: number; conditionLabel: string }>;
};

export function persistedFlowToCanvas(flow: PersistedFlowForCanvas): { items: CanvasItem[]; links: CanvasLink[] } {
  return {
    items: flow.nodes.map(node => ({ id: String(node.id), label: node.label, kind: node.nodeType, position: node.position, linkedEvidenceIds: node.linkedEvidenceIds, detail: `${node.trigger} · ${node.dataInvolved}` })),
    links: flow.edges.map(edge => ({ id: String(edge.id), source: String(edge.fromNodeId), target: String(edge.toNodeId), label: edge.conditionLabel, kind: "flow" })),
  };
}
