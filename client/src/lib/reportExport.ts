import { jsPDF } from "jspdf";

type RequirementRow = { statement: string; userStory: string; acceptanceCriteria: string[]; status: string; evidenceIds: number[] };
type FlowRow = { name: string; description: string; linkedEvidenceIds: number[]; nodes: Array<{ label: string; nodeType: string; trigger: string; dataInvolved: string; linkedEvidenceIds: number[] }>; edges: Array<{ conditionLabel: string }> };

function csvCell(value: string | number) {
  const stringValue = String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

export function toCsv(headers: string[], rows: Array<Array<string | number>>) {
  return [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\n");
}

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function cleanFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "layr-report";
}

function savePdf(title: string, sections: Array<{ heading: string; lines: string[] }>, filename: string) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48; const lineHeight = 15; const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 58;
  const ensureSpace = (height: number) => { if (y + height > pageHeight - margin) { pdf.addPage(); y = margin; } };
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.text(title, margin, y); y += 30;
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(90); pdf.text("Generated in Layr · evidence-driven research workspace", margin, y); y += 28;
  sections.forEach(section => {
    ensureSpace(26); pdf.setTextColor(20); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text(section.heading, margin, y); y += 18;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
    section.lines.forEach(line => { const wrapped = pdf.splitTextToSize(line, pageWidth - margin * 2) as string[]; ensureSpace(wrapped.length * lineHeight + 4); pdf.text(wrapped, margin, y); y += wrapped.length * lineHeight + 4; });
    y += 10;
  });
  pdf.save(filename);
}

export function exportRequirementsCsv(projectName: string, requirements: RequirementRow[]) {
  downloadBlob(`${cleanFileName(projectName)}-requirements.csv`, toCsv(["Requirement", "User story", "Acceptance criteria", "Status", "Evidence IDs"], requirements.map(item => [item.statement, item.userStory, item.acceptanceCriteria.join(" | "), item.status, item.evidenceIds.join(" ")])), "text/csv;charset=utf-8");
}

export function exportRequirementsPdf(projectName: string, requirements: RequirementRow[]) {
  savePdf(`${projectName} — Requirements`, requirements.map((item, index) => ({ heading: `${String(index + 1).padStart(2, "0")} · ${item.status}`, lines: [item.statement, `User story: ${item.userStory}`, `Acceptance criteria: ${item.acceptanceCriteria.join("; ")}`, `Evidence: ${item.evidenceIds.join(", ") || "None"}`] })), `${cleanFileName(projectName)}-requirements.pdf`);
}

export function exportFlowsCsv(projectName: string, flows: FlowRow[]) {
  const rows = flows.flatMap(flow => flow.nodes.map(node => [flow.name, flow.description, node.label, node.nodeType, node.trigger, node.dataInvolved, node.linkedEvidenceIds.join(" "), flow.linkedEvidenceIds.join(" ")]));
  downloadBlob(`${cleanFileName(projectName)}-flows.csv`, toCsv(["Flow", "Description", "Step", "Type", "Trigger", "Data involved", "Step evidence IDs", "Flow evidence IDs"], rows), "text/csv;charset=utf-8");
}

export function exportFlowsPdf(projectName: string, flows: FlowRow[]) {
  savePdf(`${projectName} — User Flows`, flows.map((flow, index) => ({ heading: `${String(index + 1).padStart(2, "0")} · ${flow.name}`, lines: [flow.description, `Flow evidence: ${flow.linkedEvidenceIds.join(", ") || "None"}`, ...flow.nodes.map(node => `${node.nodeType.toUpperCase()} — ${node.label}. Trigger: ${node.trigger}. Data: ${node.dataInvolved}. Evidence: ${node.linkedEvidenceIds.join(", ") || "None"}`), `Decision conditions: ${flow.edges.map(edge => edge.conditionLabel).filter(Boolean).join(" | ") || "None"}`] })), `${cleanFileName(projectName)}-flows.pdf`);
}
