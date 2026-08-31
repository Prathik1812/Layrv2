import { describe, expect, it } from "vitest";
import { toCsv } from "./reportExport";

describe("report CSV serialization", () => {
  it("escapes commas, quotes, and new lines in downloadable report rows", () => {
    expect(toCsv(["Title", "Detail"], [["A, B", "Line one\n\"quoted\""]])).toBe('Title,Detail\n"A, B","Line one\n""quoted"""');
  });
});
