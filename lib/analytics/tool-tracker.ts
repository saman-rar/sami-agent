import type { ToolExecutionMetric } from "./types";
import { analyticsTracker } from "./tracker";

/**
 * Wraps a tool execute function to automatically track execution metrics.
 *
 * Usage:
 *   execute: trackTool("bash", async (input, ctx) => {
 *     // tool logic here
 *   })
 */
export function trackTool<T>(
  toolName: string,
  executeFn: (input: any, ctx: any) => Promise<T>,
): (input: any, ctx: any) => Promise<T> {
  return async (input, ctx) => {
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

      const sessionId =
        ctx?.session?.auth?.current?.sessionId ??
        ctx?.session?.auth?.initiator?.sessionId ??
        undefined;

      const projectId =
        ctx?.session?.auth?.current?.attributes?.projectId ??
        ctx?.session?.auth?.initiator?.attributes?.projectId ??
        undefined;

      const metric: ToolExecutionMetric = {
        id: `${toolName}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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
        // Silently fail — analytics must never break tool execution
      }
    }
  };
}