import { describe, expect, it } from "vitest";
import { getReviewTarget } from "../client/src/lib/reviewTarget";

describe("review gap navigation", () => {
  it("routes an IA weak-traceability flag to the linked IA node", () => {
    expect(getReviewTarget(4, { linkedEntityType: "ia_node", linkedEntityId: 18 })).toBe("/projects/4/ia?highlight=18");
  });

  it("routes flow and storyboard weak-traceability flags to the linked flow work", () => {
    expect(getReviewTarget(4, { linkedEntityType: "flow", linkedEntityId: 22 })).toBe("/projects/4/flows?highlight=22");
  });
});
