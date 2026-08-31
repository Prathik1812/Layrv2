import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";
import { extractPdfText, isPdfUpload, normalizePdfText } from "./pdfText";

describe("PDF evidence extraction helpers", () => {
  it("recognises PDF MIME types and filename extensions", () => {
    expect(isPdfUpload("research.pdf", "application/octet-stream")).toBe(true);
    expect(isPdfUpload("research", "application/pdf")).toBe(true);
    expect(isPdfUpload("research.txt", "text/plain")).toBe(false);
  });

  it("normalises extracted text before it is appended to evidence", () => {
    expect(normalizePdfText("Title\r\n\r\n\r\nBody\u0000")).toBe("Title\n\nBody");
  });

  it("extracts selectable source text from a real PDF buffer", async () => {
    const pdf = new jsPDF();
    pdf.text("Evidence from a research PDF", 10, 10);
    const text = await extractPdfText(Buffer.from(pdf.output("arraybuffer")));
    expect(text).toContain("Evidence from a research PDF");
  });
});
