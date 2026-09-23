export type ContextOptimizationMode = "full" | "medium" | "low";

export type ContextPolicy = {
  mode: ContextOptimizationMode;
  compressConversation: boolean;
  compressToolResults: boolean;
  compressFiles: boolean;
  keepRecentMessages: number;
};

export const CONTEXT_POLICIES: Record<ContextOptimizationMode, ContextPolicy> = {
  full: {
    mode: "full",
    compressConversation: false,
    compressToolResults: true,
    compressFiles: false,
    keepRecentMessages: 50,
  },
  medium: {
    mode: "medium",
    compressConversation: true,
    compressToolResults: true,
    compressFiles: false,
    keepRecentMessages: 20,
  },
  low: {
    mode: "low",
    compressConversation: true,
    compressToolResults: true,
    compressFiles: true,
    keepRecentMessages: 5,
  },
};

export function getContextPolicy(mode: ContextOptimizationMode = "medium") {
  return CONTEXT_POLICIES[mode];
}
