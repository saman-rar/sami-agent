import { defineTool } from "eve/tools";
import { z } from "zod";

import { trackTool } from "@/lib/analytics/tool-tracker";

export default defineTool({
  description:
    "Inspect Git status for the active project sandbox. Use this before committing or when summarizing changed files. This is read-only and does not modify the repository.",
  inputSchema: z.object({}),
  execute: trackTool("git_status", async (_input, ctx) => {
    const sandbox = await ctx.getSandbox();
    return sandbox.run({ command: "git status --short --branch" });
  }),
});