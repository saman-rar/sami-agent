import { defineTool } from "eve/tools";
import { z } from "zod";

import { trackTool } from "@/lib/analytics/tool-tracker";

export default defineTool({
  description:
    "Read recent Git commit history from the active project sandbox. Use it to understand conventions or recent work without modifying the repository.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(20),
  }),
  execute: trackTool("git_log", async ({ limit }, ctx) => {
    const sandbox = await ctx.getSandbox();
    return sandbox.run({
      command: `git log -n ${limit} --date=iso-strict --pretty=format:'%h%x09%ad%x09%an%x09%s'`,
    });
  }),
});