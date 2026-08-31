import { ENV } from "./_core/env";
import { invokeLLM, listLLMModels } from "./_core/llm";
import type { SourceEvidence } from "./designGeneration";

export type GeneratedFeaturePipeline = { features: Array<{ clientId: string; title: string; rationale: string; evidenceIds: number[]; requirements: Array<{ requirementType: "functional" | "non_functional" | "error_handling"; statement: string; userStory: string; acceptanceCriteria: string[]; evidenceIds: number[] }> }> };

export async function generateFeaturesFromEvidence(evidence: SourceEvidence[]): Promise<GeneratedFeaturePipeline> {
  if (!evidence.length) throw new Error("Add evidence before generating feature candidates.");
  const model = ENV.llmModel || "nvidia/nemotron-3.5-lightning-30b-a3b";
  const source = evidence.map(item => `ID ${item.id}\n${item.title}\n${item.source} (${item.sourceType})\nTags: ${item.tags.join(", ") || "none"}\n${item.rawText.slice(0, 3500)}`).join("\n\n---\n\n");
  const response = await invokeLLM({ model, messages: [
    { role: "system", content: "You are a rigorous product strategist. Propose only features and requirements that are directly grounded in the supplied research. Every candidate and requirement must include the evidence IDs that support it. Avoid feature lists that claim unsupported user needs." },
    { role: "user", content: `Extract a concise set of evidence-backed feature candidates. For each candidate, state the rationale and write atomic functional, non-functional, or error-handling requirements. A requirement needs a clear statement, one user story, and testable acceptance criteria.\n\nEvidence:\n${source}` },
  ], response_format: { type: "json_schema", json_schema: { name: "evidence_backed_features", strict: true, schema: { type: "object", properties: { features: { type: "array", items: { type: "object", properties: { clientId: { type: "string" }, title: { type: "string" }, rationale: { type: "string" }, evidenceIds: { type: "array", items: { type: "integer" } }, requirements: { type: "array", items: { type: "object", properties: { requirementType: { type: "string", enum: ["functional", "non_functional", "error_handling"] }, statement: { type: "string" }, userStory: { type: "string" }, acceptanceCriteria: { type: "array", items: { type: "string" } }, evidenceIds: { type: "array", items: { type: "integer" } } }, required: ["requirementType", "statement", "userStory", "acceptanceCriteria", "evidenceIds"], additionalProperties: false } } }, required: ["clientId", "title", "rationale", "evidenceIds", "requirements"], additionalProperties: false } } }, required: ["features"], additionalProperties: false } } },
  });
  const raw = response.choices[0]?.message.content; if (!raw || typeof raw !== "string") throw new Error("The feature service returned no structured output.");
  return JSON.parse(raw) as GeneratedFeaturePipeline;
}
