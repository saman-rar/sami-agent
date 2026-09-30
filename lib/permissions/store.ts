import { readLatestPrivateJsonUnderPrefix, readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import { legacyUserHash, ownerStoragePath } from "@/lib/persistence/single-owner";
import type { AgentPermissionMode, AgentPermissionSettings } from "./types";

const DOCUMENT_VERSION = 1 as const;
const DEFAULT_MODE: AgentPermissionMode = "ask-before";

type PermissionDocument = {
  version: typeof DOCUMENT_VERSION;
  mode: AgentPermissionMode;
  updatedAt?: string;
};

const STORAGE_PATH = ownerStoragePath("settings/permissions", DOCUMENT_VERSION);

function emptyDocument(): PermissionDocument {
  return { version: DOCUMENT_VERSION, mode: DEFAULT_MODE };
}

function legacyStoragePath(userId: string): string {
  return `settings/permissions/v1/${legacyUserHash(userId)}.json`;
}

export async function readAgentPermissionSettings(
  userId: string,
): Promise<AgentPermissionSettings> {
  let document = await readPrivateJson<PermissionDocument>(STORAGE_PATH);
  if (!document) {
    document = await readPrivateJson<PermissionDocument>(legacyStoragePath(userId));
    document ??= await readLatestPrivateJsonUnderPrefix<PermissionDocument>("settings/permissions/v1/");
    if (document) await writePrivateJson(STORAGE_PATH, document);
  }
  if (!document) document = emptyDocument();
  if (
    document.version !== DOCUMENT_VERSION ||
    !["no-access", "ask-before", "full-access"].includes(document.mode)
  ) {
    throw new Error("Agent permissions have an unsupported format.");
  }
  return { mode: document.mode, updatedAt: document.updatedAt };
}

export async function writeAgentPermissionMode(
  _userId: string,
  mode: AgentPermissionMode,
): Promise<AgentPermissionSettings> {
  const updatedAt = new Date().toISOString();
  const document: PermissionDocument = { version: DOCUMENT_VERSION, mode, updatedAt };
  await writePrivateJson(STORAGE_PATH, document);
  return { mode, updatedAt };
}
