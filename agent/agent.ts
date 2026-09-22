import { defineAgent, defineDynamic } from "eve";
import {
  DEFAULT_EVE_MODEL,
  resolveSelectedModelForRuntime,
} from "@/lib/providers/service";
import { trackLLMRequest } from "@/lib/analytics/runtime";

export default defineAgent({
  model: defineDynamic({
    events: {
      "step.started": async (_event, ctx) => {
        const current = ctx.session.auth.current;
        const initiator = ctx.session.auth.initiator;
        const principal =
          current?.principalType === "user"
            ? current
            : initiator?.principalType === "user"
              ? initiator
              : undefined;

        if (principal) {
          return resolveSelectedModelForRuntime(principal.principalId);
        }

        if (process.env.NODE_ENV === "development") {
          return resolveSelectedModelForRuntime("local-dev");
        }

        return DEFAULT_EVE_MODEL;
      },
      "step.completed": async (event, ctx) => {
        // Extract LLM metrics from the event
        const sessionId = ctx.session?.auth?.current?.sessionId
          ?? ctx.session?.auth?.initiator?.sessionId
          ?? undefined;
          
        const projectId = ctx.session?.auth?.current?.attributes?.projectId
          ?? ctx.session?.auth?.initiator?.attributes?.projectId
          ?? undefined;
          
        // Try to get LLM metrics from the event
        // The event structure may vary, but we'll try to extract common fields
        const metrics = event.metrics || event.result || {};
        
        if (metrics.provider && metrics.model) {
          trackLLMRequest({
            id: `${metrics.id || Math.random().toString(36).substr(2, 9)}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            sessionId,
            projectId,
            provider: metrics.provider,
            model: metrics.model,
            requestNumber: metrics.requestNumber ?? 1,
            inputTokens: metrics.inputTokens ?? 0,
            outputTokens: metrics.outputTokens ?? 0,
            reasoningTokens: metrics.reasoningTokens ?? 0,
            cachedTokens: metrics.cachedTokens ?? 0,
            durationMs: metrics.durationMs ?? 0,
            finishReason: metrics.finishReason,
          });
        }
      },
      "step.failed": async (event, ctx) => {
        // Track failed LLM requests as well
        const sessionId = ctx.session?.auth?.current?.sessionId
          ?? ctx.session?.auth?.initiator?.sessionId
          ?? undefined;
          
        const projectId = ctx.session?.auth?.current?.attributes?.projectId
          ?? ctx.session?.auth?.initiator?.attributes?.projectId
          ?? undefined;
        
        // Try to get error information
        const error = event.error || {};
        const metrics = event.metrics || {};
        
        if (metrics.provider && metrics.model) {
          trackLLMRequest({
            id: `${metrics.id || Math.random().toString(36).substr(2, 9)}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            sessionId,
            projectId,
            provider: metrics.provider,
            model: metrics.model,
            requestNumber: metrics.requestNumber ?? 1,
            inputTokens: metrics.inputTokens ?? 0,
            outputTokens: metrics.outputTokens ?? 0,
            reasoningTokens: metrics.reasoningTokens ?? 0,
            cachedTokens: metrics.cachedTokens,
            durationMs: metrics.durationMs ?? 0,
            finishReason: error.type || "error",
          });
        }
      },
    },
  }),
});