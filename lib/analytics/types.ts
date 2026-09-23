export type AnalyticsTokenMode = "full" | "medium" | "maximum";

export type LLMRequestMetric = {
  id: string;
  timestamp: string;
  sessionId?: string;
  projectId?: string;
  provider: string;
  model: string;
  requestNumber: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  durationMs: number;
  finishReason?: string;
};

export type ToolExecutionMetric = {
  id: string;
  timestamp: string;
  sessionId?: string;
  toolName: string;
  durationMs: number;
  success: boolean;
  error?: string;
  inputSize?: number;
};

export type MCPExecutionMetric = {
  id: string;
  timestamp: string;
  server: string;
  tool: string;
  durationMs: number;
  success: boolean;
};

export type SkillUsageMetric = {
  id: string;
  timestamp: string;
  skill: string;
};

// Backward-compatible alias used by analytics recorder.
export type ToolMetric = ToolExecutionMetric;
