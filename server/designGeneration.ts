import { ENV } from "./_core/env";
import { invokeLLM, listLLMModels } from "./_core/llm";

export type SourceEvidence = { id: number; title: string; source: string; sourceType: string; rawText: string; tags: string[] };

export type GeneratedDesign = {
  ia: {
    nodes: Array<{ clientId: string; parentClientId: string; label: string; nodeType: "page" | "modal" | "sheet" | "external_link"; linkedEvidenceIds: number[] }>;
    edges: Array<{ fromClientId: string; toClientId: string; edgeType: "primary_nav" | "secondary_nav" | "contextual" }>;
  };
  flows: Array<{
    clientId: string;
    name: string;
    description: string;
    linkedEvidenceIds: number[];
    nodes: Array<{ clientId: string; nodeType: "start" | "action" | "screen" | "decision" | "end_success" | "end_failure"; label: string; trigger: string; dataInvolved: string; linkedEvidenceIds: number[] }>;
    edges: Array<{ fromClientId: string; toClientId: string; conditionLabel: string }>;
  }>;
  storyboard: Array<{ flowClientId: string; linkedFlowNodeClientId: string; orderIndex: number; caption: string; linkedEvidenceIds: number[] }>;
  gaps: Array<{ flagType: "unused_evidence" | "orphaned_page" | "missing_error_path" | "weak_traceability"; title: string; description: string; whyItMatters: string; severity: "high" | "medium" | "low"; linkedEntityType: "evidence" | "ia_node" | "flow" | "flow_node"; linkedEntityClientId: string }>;
};

export function assertUsableGeneratedDesign(design: GeneratedDesign) {
  if (design.ia.nodes.length < 2) throw new Error("The design service returned an incomplete information architecture. Please generate again.");
  if (!design.flows.length) throw new Error("The design service returned no user flows. Please generate again from the available evidence.");
  design.flows.forEach(flow => {
    const nodeTypes = new Set(flow.nodes.map(node => node.nodeType));
    const missing = ["start", "decision", "end_success", "end_failure"].filter(type => !nodeTypes.has(type as "start"));
    if (missing.length || flow.edges.length < 4) throw new Error(`The generated flow “${flow.name}” is incomplete (${missing.length ? `missing ${missing.join(", ")}` : "missing connected paths"}). Please generate again.`);
  });
  return design;
}

export function enrichTraceabilityGaps(design: GeneratedDesign, evidenceIds: number[]) {
  const gaps = [...design.gaps];
  const hasGap = (type: GeneratedDesign["gaps"][number]["flagType"], linkedEntityClientId: string) => gaps.some(gap => gap.flagType === type && gap.linkedEntityClientId === linkedEntityClientId);
  const referencedEvidence = new Set<number>([
    ...design.ia.nodes.flatMap(node => node.linkedEvidenceIds),
    ...design.flows.flatMap(flow => [
      ...flow.linkedEvidenceIds,
      ...flow.nodes.flatMap(node => node.linkedEvidenceIds),
    ]),
    ...design.storyboard.flatMap(panel => panel.linkedEvidenceIds),
  ]);
  evidenceIds.filter(id => !referencedEvidence.has(id)).forEach(id => {
    if (!hasGap("unused_evidence", String(id))) gaps.push({ flagType: "unused_evidence", title: "Evidence remains unused", description: `Evidence ${id} is not referenced by any generated IA node, flow step, or storyboard panel.`, whyItMatters: "Unreferenced research can conceal a user need that the design pipeline did not address.", severity: "medium", linkedEntityType: "evidence", linkedEntityClientId: String(id) });
  });
  const connected = new Set(design.ia.edges.flatMap(edge => [edge.fromClientId, edge.toClientId]));
  design.ia.nodes.filter(node => node.parentClientId && !connected.has(node.clientId)).forEach(node => {
    if (!hasGap("orphaned_page", node.clientId)) gaps.push({ flagType: "orphaned_page", title: "Orphaned IA node", description: `${node.label} has no usable navigation relationship in the sitemap.`, whyItMatters: "A page without a reachable relationship may never be encountered in the intended user journey.", severity: "medium", linkedEntityType: "ia_node", linkedEntityClientId: node.clientId });
  });
  design.flows.forEach(flow => {
    const hasFailure = flow.nodes.some(node => node.nodeType === "end_failure");
    if (!hasFailure && !hasGap("missing_error_path", flow.clientId)) gaps.push({ flagType: "missing_error_path", title: "Flow has no error termination", description: `${flow.name} does not include an explicit failure or recovery path.`, whyItMatters: "Happy-path-only flows leave validation, permissions, and service failures unresolved.", severity: "high", linkedEntityType: "flow", linkedEntityClientId: flow.clientId });
  });
  design.ia.nodes.filter(node => node.linkedEvidenceIds.length === 0).forEach(node => {
    if (!hasGap("weak_traceability", node.clientId)) gaps.push({ flagType: "weak_traceability", title: "IA node lacks evidence support", description: `${node.label} is present in the sitemap without any linked source evidence.`, whyItMatters: "Unsupported structure can turn an assumption into a navigation commitment without research backing.", severity: "medium", linkedEntityType: "ia_node", linkedEntityClientId: node.clientId });
  });
  design.flows.filter(flow => flow.linkedEvidenceIds.length === 0 && flow.nodes.every(node => node.linkedEvidenceIds.length === 0)).forEach(flow => {
    if (!hasGap("weak_traceability", flow.clientId)) gaps.push({ flagType: "weak_traceability", title: "Flow lacks evidence support", description: `${flow.name} and its steps have no linked source evidence.`, whyItMatters: "An unsupported journey can conceal invented user behavior or untested product assumptions.", severity: "high", linkedEntityType: "flow", linkedEntityClientId: flow.clientId });
  });
  design.storyboard.filter(panel => panel.linkedEvidenceIds.length === 0).forEach(panel => {
    const key = `${panel.flowClientId}:${panel.linkedFlowNodeClientId}`;
    if (!hasGap("weak_traceability", key)) gaps.push({ flagType: "weak_traceability", title: "Storyboard panel lacks evidence support", description: `Storyboard step ${panel.orderIndex} has no linked source evidence.`, whyItMatters: "A visual journey summary should remain traceable to the research that justifies the interaction.", severity: "low", linkedEntityType: "flow", linkedEntityClientId: key });
  });
  return { ...design, gaps };
}

function evidencePrompt(evidence: SourceEvidence[]) {
  return evidence.map(item => [
    `Evidence ID: ${item.id}`,
    `Title: ${item.title}`,
    `Source: ${item.source} (${item.sourceType})`,
    `Tags: ${item.tags.join(", ") || "none"}`,
    `Raw evidence: ${item.rawText.slice(0, 4000)}`,
  ].join("\n")).join("\n\n---\n\n");
}

export async function generateDesignFromEvidence(evidence: SourceEvidence[]): Promise<GeneratedDesign> {
  if (!evidence.length) throw new Error("Add at least one evidence item before generating the design pipeline.");
  const model = ENV.llmModel || "nvidia/nemotron-3.5-lightning-30b-a3b";
  const response = await invokeLLM({
    model,
    messages: [
      { role: "system", content: "You are a senior product researcher and interaction architect. You may only base recommendations on the evidence supplied. Every IA node, user-flow node, storyboard panel, and risk flag must contain evidence IDs that support it. Never claim unsupported facts." },
      { role: "user", content: `Turn this project's raw evidence into a traceable product-design pipeline.\n\nBuild an information architecture as a real sitemap: one central Home/entry node, at least three top-level branches, and nested pages. Use page, modal, sheet, and external_link nodes where appropriate. Edges must be primary_nav, secondary_nav, or contextual.\n\nGenerate one or more user flows with real conditional branching and remerging. Every flow needs a start, action/screen steps, at least one decision, a successful end, and a failure/error end. Every edge leaving a decision must have a human-readable condition label.\n\nCreate a storyboard for the primary flow as an ordered sequence of concise, visual action captions.\n\nFinally, surface research/design gaps: unused evidence, orphaned pages, missing error paths, or weak evidence traceability.\n\nUse stable short client IDs (e.g. ia_home, flow_signup, fn_auth_decision) for relationships. For root parentClientId and gaps with no link, use an empty string.\n\nEvidence:\n${evidencePrompt(evidence)}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "evidence_derived_product_design",
        strict: true,
        schema: {
          type: "object",
          properties: {
            ia: {
              type: "object",
              properties: {
                nodes: { type: "array", minItems: 2, items: { type: "object", properties: { clientId: { type: "string" }, parentClientId: { type: "string" }, label: { type: "string" }, nodeType: { type: "string", enum: ["page", "modal", "sheet", "external_link"] }, linkedEvidenceIds: { type: "array", items: { type: "integer" } } }, required: ["clientId", "parentClientId", "label", "nodeType", "linkedEvidenceIds"], additionalProperties: false } },
                edges: { type: "array", items: { type: "object", properties: { fromClientId: { type: "string" }, toClientId: { type: "string" }, edgeType: { type: "string", enum: ["primary_nav", "secondary_nav", "contextual"] } }, required: ["fromClientId", "toClientId", "edgeType"], additionalProperties: false } },
              }, required: ["nodes", "edges"], additionalProperties: false,
            },
            flows: { type: "array", minItems: 1, items: { type: "object", properties: {
              clientId: { type: "string" }, name: { type: "string" }, description: { type: "string" }, linkedEvidenceIds: { type: "array", items: { type: "integer" } },
              nodes: { type: "array", minItems: 5, items: { type: "object", properties: { clientId: { type: "string" }, nodeType: { type: "string", enum: ["start", "action", "screen", "decision", "end_success", "end_failure"] }, label: { type: "string" }, trigger: { type: "string" }, dataInvolved: { type: "string" }, linkedEvidenceIds: { type: "array", items: { type: "integer" } } }, required: ["clientId", "nodeType", "label", "trigger", "dataInvolved", "linkedEvidenceIds"], additionalProperties: false } },
              edges: { type: "array", minItems: 4, items: { type: "object", properties: { fromClientId: { type: "string" }, toClientId: { type: "string" }, conditionLabel: { type: "string" } }, required: ["fromClientId", "toClientId", "conditionLabel"], additionalProperties: false } },
            }, required: ["clientId", "name", "description", "linkedEvidenceIds", "nodes", "edges"], additionalProperties: false } },
            storyboard: { type: "array", items: { type: "object", properties: { flowClientId: { type: "string" }, linkedFlowNodeClientId: { type: "string" }, orderIndex: { type: "integer" }, caption: { type: "string" }, linkedEvidenceIds: { type: "array", items: { type: "integer" } } }, required: ["flowClientId", "linkedFlowNodeClientId", "orderIndex", "caption", "linkedEvidenceIds"], additionalProperties: false } },
            gaps: { type: "array", items: { type: "object", properties: { flagType: { type: "string", enum: ["unused_evidence", "orphaned_page", "missing_error_path", "weak_traceability"] }, title: { type: "string" }, description: { type: "string" }, whyItMatters: { type: "string" }, severity: { type: "string", enum: ["high", "medium", "low"] }, linkedEntityType: { type: "string", enum: ["evidence", "ia_node", "flow", "flow_node"] }, linkedEntityClientId: { type: "string" } }, required: ["flagType", "title", "description", "whyItMatters", "severity", "linkedEntityType", "linkedEntityClientId"], additionalProperties: false } },
          },
          required: ["ia", "flows", "storyboard", "gaps"],
          additionalProperties: false,
        },
      },
    },
  });
  const raw = response.choices[0]?.message.content;
  if (!raw || typeof raw !== "string") throw new Error("The design service returned no structured output.");
  return enrichTraceabilityGaps(assertUsableGeneratedDesign(JSON.parse(raw) as GeneratedDesign), evidence.map(item => item.id));
}
