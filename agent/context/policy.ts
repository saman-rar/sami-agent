import type { ContextCompressionMode } from "@/lib/agent-config/types";

export type ContextPolicy = {
  mode: ContextCompressionMode;
  compressConversation: boolean;
  compressToolResults: boolean;
  compressFiles: boolean;
  keepRecentMessages: number;
};

export const CONTEXT_POLICIES: Record<ContextCompressionMode, ContextPolicy> = {
  full: {
    mode: "full",
    compressConversation: false,
    compressToolResults: false,
    compressFiles: false,
    keepRecentMessages: 50,
  },
  medium: {
    mode: "medium",
    compressConversation: false,
    compressToolResults: true,
    compressFiles: false,
    keepRecentMessages: 50,
  },
  maximum: {
    mode: "maximum",
    compressConversation: true,
    compressToolResults: true,
    compressFiles: true,
    keepRecentMessages: 8,
  },
};

export function getContextPolicy(mode: ContextCompressionMode = "medium") {
  return CONTEXT_POLICIES[mode];
}
