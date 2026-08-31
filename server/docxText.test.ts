import { Document, Packer, Paragraph } from "docx";
import { describe, expect, it } from "vitest";
import { extractDocxText, isDocxUpload, normalizeDocxText } from "./docxText";

describe("DOCX evidence extraction helpers", () => {
  it("recognises DOCX MIME types and filename extensions", () => {
    expect(isDocxUpload("interview.docx", "application/octet-stream")).toBe(true);
    expect(isDocxUpload("interview", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    expect(isDocxUpload("interview.pdf", "application/pdf")).toBe(false);
  });

  it("normalises extracted document text before it is appended to evidence", () => {
    expect(normalizeDocxText("Heading\r\n\r\n\r\nFinding\u0000")).toBe("Heading\n\nFinding");
  });

  it("extracts selectable text from a real DOCX buffer", async () => {
    const document = new Document({ sections: [{ children: [new Paragraph("Research evidence from a DOCX source")] }] });
    const text = await extractDocxText(Buffer.from(await Packer.toBuffer(document)));
    expect(text).toContain("Research evidence from a DOCX source");
  });
});
