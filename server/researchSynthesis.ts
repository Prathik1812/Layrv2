import { ENV } from "./_core/env";
import { invokeLLM, listLLMModels } from "./_core/llm";

export type EvidenceForSynthesis = {
  id: number;
  title: string;
  source: string;
  sourceType: string;
  rawText: string;
  tags: string[];
};

export type SynthesisResult = {
  findings: Array<{ title: string; summary: string; evidenceIds: number[] }>;
  opportunities: Array<{ title: string; rationale: string; evidenceIds: number[] }>;
  unresolvedQuestions: Array<{ question: string; context: string; evidenceIds: number[] }>;
};

export function buildSynthesisPrompt(evidence: EvidenceForSynthesis[]) {
  return evidence
    .map(item => [
      `Evidence ID: ${item.id}`,
      `Title: ${item.title}`,
      `Source: ${item.source} (${item.sourceType})`,
      `Tags: ${item.tags.join(", ") || "None"}`,
      `Content: ${item.rawText.slice(0, 4500)}`,
    ].join("\n"))
    .join("\n\n---\n\n");
}

export async function synthesizeEvidence(evidence: EvidenceForSynthesis[]): Promise<SynthesisResult> {
  const model = ENV.llmModel || "nvidia/nemotron-3.5-lightning-30b-a3b";

  const response = await invokeLLM({
    model,
    messages: [
      {
        role: "system",
        content: "You are a rigorous product researcher. Synthesize only what the evidence supports. Keep each statement concise, cite evidence IDs, and label uncertainty rather than inventing facts.",
      },
      {
        role: "user",
        content: `Analyze the selected research evidence below. Produce concise findings, actionable opportunities, and unresolved questions.\n\n${buildSynthesisPrompt(evidence)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "research_synthesis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  summary: { type: "string" },
                  evidenceIds: { type: "array", items: { type: "integer" } },
                },
                required: ["title", "summary", "evidenceIds"],
                additionalProperties: false,
              },
            },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  rationale: { type: "string" },
                  evidenceIds: { type: "array", items: { type: "integer" } },
                },
                required: ["title", "rationale", "evidenceIds"],
                additionalProperties: false,
              },
            },
            unresolvedQuestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  context: { type: "string" },
                  evidenceIds: { type: "array", items: { type: "integer" } },
                },
                required: ["question", "context", "evidenceIds"],
                additionalProperties: false,
              },
            },
          },
          required: ["findings", "opportunities", "unresolvedQuestions"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.choices[0]?.message.content;
  if (!raw || typeof raw !== "string") {
    throw new Error("The synthesis service returned no structured analysis.");
  }
  return JSON.parse(raw) as SynthesisResult;
}
