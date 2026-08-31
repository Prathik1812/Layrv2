import { describe, expect, it } from "vitest";
import { getReviewTarget } from "./reviewTarget";

describe("getReviewTarget", () => {
  it("opens an IA weak-traceability gap at its linked node", () => {
    expect(getReviewTarget(4, { linkedEntityType: "ia_node", linkedEntityId: 18 })).toBe("/projects/4/ia?highlight=18");
  });

  it("opens flow and storyboard weak-traceability gaps in the flow workspace", () => {
    expect(getReviewTarget(4, { linkedEntityType: "flow", linkedEntityId: 22 })).toBe("/projects/4/flows?highlight=22");
  });
});
