import type { LLMRequestMetric, ToolMetric } from "./types";
import { appendAnalytics } from "./store";

export async function recordLLMRequest(metric: LLMRequestMetric) {
  await appendAnalytics("llm", metric);
}

export async function recordToolExecution(metric: ToolMetric) {
  await appendAnalytics("tools", metric);
}
