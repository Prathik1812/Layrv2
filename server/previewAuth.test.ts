import { afterEach, describe, expect, it } from "vitest";
import { isDevelopmentPreviewRequest, PREVIEW_AUTH_HEADER, PREVIEW_AUTH_VALUE } from "./previewAuth";

const originalNodeEnv = process.env.NODE_ENV;
afterEach(() => { process.env.NODE_ENV = originalNodeEnv; });

describe("development preview authentication boundary", () => {
  it("permits the preview marker only in development", () => {
    process.env.NODE_ENV = "development";
    expect(isDevelopmentPreviewRequest({ [PREVIEW_AUTH_HEADER]: PREVIEW_AUTH_VALUE })).toBe(true);
  });

  it("never permits the preview marker outside development", () => {
    process.env.NODE_ENV = "production";
    expect(isDevelopmentPreviewRequest({ [PREVIEW_AUTH_HEADER]: PREVIEW_AUTH_VALUE })).toBe(false);
  });
});
