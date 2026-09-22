import { readAnalyticsStore } from "@/lib/analytics/store";
import { apiErrorResponse, noStoreJson } from "@/lib/server/api";
import { requireCurrentUser } from "@/lib/server/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireCurrentUser();
    const snapshot = await readAnalyticsStore();

    return noStoreJson({
      requests: snapshot.llm.length,
      tools: snapshot.tools,
      mcp: snapshot.mcp,
      skills: snapshot.skills,
      tokens: snapshot.llm.reduce(
        (acc, item) => ({
          input: acc.input + item.inputTokens,
          output: acc.output + item.outputTokens,
          reasoning: acc.reasoning + item.reasoningTokens,
          cached: acc.cached + item.cachedTokens,
        }),
        { input: 0, output: 0, reasoning: 0, cached: 0 },
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
