import mammoth from "mammoth";

const MAX_EXTRACTED_CHARS = 48000;

export function isDocxUpload(fileName: string, mimeType: string) {
  return mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.toLowerCase().endsWith(".docx");
}

export function normalizeDocxText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_EXTRACTED_CHARS);
}

export async function extractDocxText(fileBuffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return normalizeDocxText(result.value);
}
