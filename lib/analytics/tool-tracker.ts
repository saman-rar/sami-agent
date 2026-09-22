import type { ToolExecutionMetric } from "./types";
import { analyticsTracker } from "./tracker";

/**
 * Wraps a tool execution to automatically track metrics.
 * 
 * @param toolName - The name of the tool for tracking
 * @param executeFn - The original execute function
 * @param ctx - The tool context (for session/project info)
 * @returns The result of the execute function
 */
export async function withToolTracking<T>(
  toolName: string,
  executeFn: (input: any, ctx: any) => Promise<T>,
  input: any,
  ctx: any
): Promise<T> {
  const start = Date.now();
  let success = false;
  let error: string | undefined;

  try {
    const result = await executeFn(input, ctx);
    success = true;
    return result;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const durationMs = Date.now() - start;
    
    const sessionId = ctx?.session?.auth?.current?.sessionId 
      ?? ctx?.session?.auth?.initiator?.sessionId
      ?? undefined;
      
    const projectId = ctx?.session?.auth?.current?.attributes?.projectId
      ?? ctx?.session?.auth?.initiator?.attributes?.projectId
      ?? undefined;
      
    const metric: ToolExecutionMetric = {
      id: `${toolName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId,
      projectId,
      toolName,
      durationMs,
      success,
      error,
    };
    
    try {
      analyticsTracker.recordTool(metric);
    } catch {
      // Silently fail - analytics should not break tool execution
    }
  }
}