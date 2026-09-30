import type { ContextBudget } from "./types";

export function createContextBudget(maxTokens = 128000): ContextBudget {
  return {
    maxTokens,
    systemTokens: Math.floor(maxTokens * 0.15),
    projectTokens: Math.floor(maxTokens * 0.15),
    conversationTokens: Math.floor(maxTokens * 0.25),
    toolTokens: Math.floor(maxTokens * 0.45),
  };
}

export function truncateToolOutput(value: string, limit = 6000) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n\n[output truncated - request specific lines if needed]`;
}
