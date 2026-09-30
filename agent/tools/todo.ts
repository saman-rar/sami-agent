import { defineTool } from "eve/tools";
import { z } from "zod";
import { normalizeAgentMode } from "@/lib/agent-mode";
import {
  clearAgentPlan,
  readAgentPlan,
  replaceAgentPlan,
  updateAgentTodo,
} from "@/lib/agent-plan/store";

const todoStatusSchema = z.enum(["pending", "in_progress", "completed"]);

export default defineTool({
  description:
    "Manage Sami's internal project-scoped implementation todo plan. Plan mode should replace the todo list after exploration. Build mode should read it first when relevant and update items as work progresses. This state is internal agent planning state and does not modify project files.",
  inputSchema: z.object({
    action: z.enum(["read", "replace", "update", "clear"]),
    items: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(300),
        }),
      )
      .max(50)
      .optional(),
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(300).optional(),
    status: todoStatusSchema.optional(),
  }),
  async execute({ action, items, id, title, status }, ctx) {
    const current = ctx.session.auth.current;
    const initiator = ctx.session.auth.initiator;
    const mode = normalizeAgentMode(
      current?.attributes?.agentMode ?? initiator?.attributes?.agentMode,
    );
    const projectId =
      current?.attributes?.projectId ?? initiator?.attributes?.projectId;
    const scope = typeof projectId === "string" && projectId.trim()
      ? `project:${projectId.trim()}`
      : "workspace:default";

    if (action === "read") {
      return readAgentPlan(scope);
    }

    if (mode === "ask") {
      throw new Error("Ask mode does not create or modify implementation todos.");
    }

    if (action === "replace") {
      if (!items) throw new Error("items is required when replacing the todo plan.");
      return replaceAgentPlan(
        scope,
        items.map((item: { title: string }) => item.title),
      );
    }

    if (action === "update") {
      if (!id) throw new Error("id is required when updating a todo item.");
      if (title === undefined && status === undefined) {
        throw new Error("title or status is required when updating a todo item.");
      }
      return updateAgentTodo(scope, id, { title, status });
    }

    return clearAgentPlan(scope);
  },
});
