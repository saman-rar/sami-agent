import { analyticsTracker } from './tracker';
import { recordLLMRequest, recordToolExecution } from './recorder';
import type { LLMRequestMetric, ToolExecutionMetric } from './types';

export async function trackLLMRequest(metric: LLMRequestMetric) {
  analyticsTracker.recordLLM(metric);
  await recordLLMRequest(metric);
}

export async function trackToolExecution(metric: ToolExecutionMetric) {
  analyticsTracker.recordTool(metric);
  await recordToolExecution(metric);
}

export function getAnalyticsSnapshot() {
  return analyticsTracker.snapshot();
}
