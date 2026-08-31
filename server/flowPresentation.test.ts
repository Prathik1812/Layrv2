import { describe, expect, it } from "vitest";
import { persistedFlowToCanvas } from "../client/src/lib/flowPresentation";

describe("Flow-stage presentation mapping", () => {
  it("turns persisted generated flow records into renderable canvas nodes and links", () => {
    const canvas = persistedFlowToCanvas({ nodes: [{ id: 11, label: "Start", nodeType: "start", position: { x: 20, y: 30 }, linkedEvidenceIds: [1], trigger: "Open", dataInvolved: "None" }, { id: 12, label: "Success", nodeType: "end_success", position: { x: 220, y: 30 }, linkedEvidenceIds: [1], trigger: "Complete", dataInvolved: "Receipt" }], edges: [{ id: 8, fromNodeId: 11, toNodeId: 12, conditionLabel: "continue" }] });
    expect(canvas.items).toHaveLength(2);
    expect(canvas.items[0]).toMatchObject({ id: "11", position: { x: 20, y: 30 } });
    expect(canvas.links).toEqual([expect.objectContaining({ source: "11", target: "12", label: "continue" })]);
  });
});
