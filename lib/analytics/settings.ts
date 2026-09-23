import { ownerStoragePath } from "@/lib/persistence/single-owner";
import { readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import type { AnalyticsTokenMode } from "./types";

const DOCUMENT_VERSION = 1 as const;
const STORAGE_PATH = ownerStoragePath("settings/analytics", DOCUMENT_VERSION);

export type AnalyticsSettings = {
  tokenMode: AnalyticsTokenMode;
  updatedAt?: string;
};

type AnalyticsSettingsDocument = AnalyticsSettings & {
  version: typeof DOCUMENT_VERSION;
};

const DEFAULT_SETTINGS: AnalyticsSettings = {
  tokenMode: "medium",
};

export async function readAnalyticsSettings(): Promise<AnalyticsSettings> {
  const document = await readPrivateJson<AnalyticsSettingsDocument>(STORAGE_PATH);
  if (!document) return DEFAULT_SETTINGS;
  if (
    document.version !== DOCUMENT_VERSION ||
    !["full", "medium", "maximum"].includes(document.tokenMode)
  ) {
    throw new Error("Analytics settings have an unsupported format.");
  }
  return { tokenMode: document.tokenMode, updatedAt: document.updatedAt };
}

export async function writeAnalyticsSettings(
  settings: Pick<AnalyticsSettings, "tokenMode">,
): Promise<AnalyticsSettings> {
  const next: AnalyticsSettingsDocument = {
    version: DOCUMENT_VERSION,
    tokenMode: settings.tokenMode,
    updatedAt: new Date().toISOString(),
  };
  await writePrivateJson(STORAGE_PATH, next);
  return { tokenMode: next.tokenMode, updatedAt: next.updatedAt };
}
