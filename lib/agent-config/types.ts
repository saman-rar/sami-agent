export const CONTEXT_COMPRESSION_MODES = ["full", "medium", "maximum"] as const;

export type ContextCompressionMode = (typeof CONTEXT_COMPRESSION_MODES)[number];

export type AgentConfigurationSettings = {
  contextCompression: ContextCompressionMode;
  updatedAt?: string;
};

export const DEFAULT_CONTEXT_COMPRESSION: ContextCompressionMode = "medium";

export const CONTEXT_COMPRESSION_DESCRIPTIONS: Record<
  ContextCompressionMode,
  { title: string; description: string; instruction: string }
> = {
  full: {
    title: "Full context",
    description:
      "Keep conversation and project context intact. Only discard clearly duplicated or useless tool noise.",
    instruction:
      "Prefer context completeness. Keep useful conversation and project context, and only compress clearly duplicated, empty, or irrelevant tool output.",
  },
  medium: {
    title: "Medium compression",
    description:
      "Preserve previous conversation turns while compacting large tool results and avoiding unnecessary full-file context.",
    instruction:
      "Preserve prior conversation context. Compact large tool results, avoid unnecessary full-file reads, and prefer targeted retrieval or concise summaries for verbose outputs.",
  },
  maximum: {
    title: "Maximum compression",
    description:
      "Minimize context usage with aggressive result compression, targeted file reads, and concise carry-forward summaries.",
    instruction:
      "Minimize context usage. Aggressively compact tool/file output, prefer targeted ranges and retrieval, avoid repeated context, and carry forward concise task summaries instead of verbose historical details when possible.",
  },
};

export function normalizeContextCompressionMode(
  value: string | null | undefined,
): ContextCompressionMode {
  return CONTEXT_COMPRESSION_MODES.includes(value as ContextCompressionMode)
    ? (value as ContextCompressionMode)
    : DEFAULT_CONTEXT_COMPRESSION;
}
