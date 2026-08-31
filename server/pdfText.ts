import { PDFParse } from "pdf-parse";

const MAX_EXTRACTED_CHARS = 48000;

export function isPdfUpload(fileName: string, mimeType: string) {
  return mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}

export function normalizePdfText(text: string) {
  const normalized = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return normalized.slice(0, MAX_EXTRACTED_CHARS);
}

export async function extractPdfText(fileBuffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
  try {
    const result = await parser.getText();
    return normalizePdfText(result.text);
  } finally {
    await parser.destroy();
  }
}
