export const PREVIEW_AUTH_HEADER = "x-layr-preview";
export const PREVIEW_AUTH_VALUE = "enabled";

export function isDevelopmentPreviewRequest(headers: Record<string, unknown>) {
  const value = headers[PREVIEW_AUTH_HEADER] ?? headers[PREVIEW_AUTH_HEADER.toLowerCase()];
  return process.env.NODE_ENV === "development" && value === PREVIEW_AUTH_VALUE;
}
