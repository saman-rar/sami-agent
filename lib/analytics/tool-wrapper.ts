
import { trackToolExecution } from "./runtime";

export async function withToolAnalytics<T>(
  tool: string,
  sessionId: string | undefined,
  projectId: string | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  const started = Date.now();

  try {
    const result = await operation();

    await trackToolExecution({
      id: crypto.randomUUID(),
      timestamp: new Date(started).toISOString(),
      toolName: tool,
      sessionId,
      durationMs: Date.now() - started,
      success: true,
    });

    return result;
  } catch (error) {
    await trackToolExecution({
      id: crypto.randomUUID(),
      timestamp: new Date(started).toISOString(),
      toolName: tool,
      sessionId,
      durationMs: Date.now() - started,
      success: false,
    });

    throw error;
  }
}
