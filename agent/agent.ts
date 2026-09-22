import { defineAgent, defineDynamic } from "eve";
import { setCurrentAgentTask } from "@/lib/todo/runtime";
import {
  DEFAULT_EVE_MODEL,
  resolveSelectedModelForRuntime,
} from "@/lib/providers/service";

export default defineAgent({
  model: defineDynamic({
    events: {
      "step.started": async (_event, ctx) => {
        await setCurrentAgentTask("Working on current request").catch(() => undefined);
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
    },
  }),
});
