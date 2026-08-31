import { describe, expect, it } from "vitest";
import { assertUsableGeneratedDesign, enrichTraceabilityGaps, type GeneratedDesign } from "./designGeneration";

const bareDesign: GeneratedDesign = {
  ia: { nodes: [{ clientId: "home", parentClientId: "", label: "Home", nodeType: "page", linkedEvidenceIds: [1] }, { clientId: "orphan", parentClientId: "home", label: "Orphan page", nodeType: "page", linkedEvidenceIds: [] }], edges: [] },
  flows: [{ clientId: "flow_main", name: "Main journey", description: "A journey", linkedEvidenceIds: [1], nodes: [{ clientId: "start", nodeType: "start", label: "Start", trigger: "Open", dataInvolved: "", linkedEvidenceIds: [1] }], edges: [] }],
  storyboard: [],
  gaps: [],
};

describe("enrichTraceabilityGaps", () => {
  it("flags unused evidence, orphaned pages, and flows with no failure end", () => {
    const result = enrichTraceabilityGaps(bareDesign, [1, 2]);
    expect(result.gaps.map(gap => gap.flagType)).toEqual(expect.arrayContaining(["unused_evidence", "orphaned_page", "missing_error_path", "weak_traceability"]));
    expect(result.gaps.find(gap => gap.flagType === "unused_evidence")?.linkedEntityClientId).toBe("2");
  });

  it("flags an IA node that has no evidence link", () => {
    const result = enrichTraceabilityGaps(bareDesign, [1]);
    expect(result.gaps).toEqual(expect.arrayContaining([expect.objectContaining({ flagType: "weak_traceability", linkedEntityType: "ia_node", linkedEntityClientId: "orphan", severity: "medium" })]));
  });

  it("flags an unsupported flow and an unsupported storyboard panel", () => {
    const design = JSON.parse(JSON.stringify(bareDesign)) as GeneratedDesign;
    design.flows[0].linkedEvidenceIds = [];
    design.flows[0].nodes[0].linkedEvidenceIds = [];
    design.storyboard = [{ flowClientId: "flow_main", linkedFlowNodeClientId: "start", orderIndex: 1, caption: "A user opens the journey.", linkedEvidenceIds: [] }];
    const result = enrichTraceabilityGaps(design, [1]);
    expect(result.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ flagType: "weak_traceability", linkedEntityType: "flow", linkedEntityClientId: "flow_main", severity: "high" }),
      expect.objectContaining({ flagType: "weak_traceability", linkedEntityType: "flow", linkedEntityClientId: "flow_main:start", severity: "low" }),
    ]));
  });
});

describe("assertUsableGeneratedDesign", () => {
  it("rejects a structured response that lacks a complete branching flow", () => {
    expect(() => assertUsableGeneratedDesign(bareDesign)).toThrow("incomplete");
  });

  it("accepts an evidence-linked flow with success and failure routes", () => {
    const complete: GeneratedDesign = {
      ...bareDesign,
      ia: { ...bareDesign.ia, edges: [{ fromClientId: "home", toClientId: "orphan", edgeType: "primary_nav" }] },
      flows: [{ clientId: "flow_valid", name: "Valid journey", description: "A complete journey", linkedEvidenceIds: [1], nodes: [
        { clientId: "start", nodeType: "start", label: "Start", trigger: "Open", dataInvolved: "", linkedEvidenceIds: [1] },
        { clientId: "action", nodeType: "action", label: "Act", trigger: "Continue", dataInvolved: "", linkedEvidenceIds: [1] },
        { clientId: "decision", nodeType: "decision", label: "Eligible?", trigger: "Validate", dataInvolved: "", linkedEvidenceIds: [1] },
        { clientId: "success", nodeType: "end_success", label: "Done", trigger: "Accept", dataInvolved: "", linkedEvidenceIds: [1] },
        { clientId: "failure", nodeType: "end_failure", label: "Recover", trigger: "Reject", dataInvolved: "", linkedEvidenceIds: [1] },
      ], edges: [
        { fromClientId: "start", toClientId: "action", conditionLabel: "begin" }, { fromClientId: "action", toClientId: "decision", conditionLabel: "submit" }, { fromClientId: "decision", toClientId: "success", conditionLabel: "eligible" }, { fromClientId: "decision", toClientId: "failure", conditionLabel: "not eligible" },
      ] }],
    };
    expect(assertUsableGeneratedDesign(complete)).toBe(complete);
  });
});
