import { describe, expect, it } from "vitest";
import { toCsv } from "../client/src/lib/reportExport";

describe("downloadable report serialization", () => {
  it("escapes report values containing commas, quotes, and new lines", () => {
    expect(toCsv(["Title", "Detail"], [["A, B", "Line one\n\"quoted\""]])).toBe('Title,Detail\n"A, B","Line one\n""quoted"""');
  });
});
