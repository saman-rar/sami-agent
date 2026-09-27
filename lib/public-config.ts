export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "sami";

export const FILE_UPLOAD = {
  maxFiles: 5,
  maxFileSizeBytes: 8 * 1024 * 1024,
  accept: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    ".json",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".html",
    ".xml",
    ".yaml",
    ".yml",
  ].join(","),
} as const;

export function safeExternalUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
