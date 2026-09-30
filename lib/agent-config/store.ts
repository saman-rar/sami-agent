import { readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import { ownerStoragePath } from "@/lib/persistence/single-owner";
import {
  CONTEXT_COMPRESSION_MODES,
  DEFAULT_CONTEXT_COMPRESSION,
  type AgentConfigurationSettings,
  type ContextCompressionMode,
} from "./types";

const DOCUMENT_VERSION = 1 as const;
const STORAGE_PATH = ownerStoragePath("settings/agent-configuration", DOCUMENT_VERSION);

type AgentConfigurationDocument = {
  version: typeof DOCUMENT_VERSION;
  contextCompression: ContextCompressionMode;
  updatedAt?: string;
};

function emptyDocument(): AgentConfigurationDocument {
  return {
    version: DOCUMENT_VERSION,
    contextCompression: DEFAULT_CONTEXT_COMPRESSION,
  };
}

export async function readAgentConfigurationSettings(): Promise<AgentConfigurationSettings> {
  const document =
    (await readPrivateJson<AgentConfigurationDocument>(STORAGE_PATH)) ?? emptyDocument();

  if (
    document.version !== DOCUMENT_VERSION ||
    !CONTEXT_COMPRESSION_MODES.includes(document.contextCompression)
  ) {
    throw new Error("Agent configuration has an unsupported format.");
  }

  return {
    contextCompression: document.contextCompression,
    updatedAt: document.updatedAt,
  };
}

export async function writeAgentConfigurationSettings(
  contextCompression: ContextCompressionMode,
): Promise<AgentConfigurationSettings> {
  const updatedAt = new Date().toISOString();
  const document: AgentConfigurationDocument = {
    version: DOCUMENT_VERSION,
    contextCompression,
    updatedAt,
  };

  await writePrivateJson(STORAGE_PATH, document);
  return { contextCompression, updatedAt };
}
