import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_MODEL?.trim() || "openai/gpt-5.6-luna-fast",
  reasoning: (process.env.EVE_REASONING?.trim() || "medium") as
    | "provider-default"
    | "none"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | "xhigh",
  compaction: {
    thresholdPercent: 0.8,
  },
  limits: {
    maxInputTokensPerSession: 250_000,
    maxOutputTokensPerSession: 40_000,
    maxTokenCostUsdPerSession: 3,
    sessionTimeoutMs: 7 * 24 * 60 * 60 * 1_000,
  },
});
