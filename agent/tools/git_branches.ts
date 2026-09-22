import { defineTool } from "eve/tools";
import { z } from "zod";

import { trackTool } from "@/lib/analytics/tool-tracker";

export default defineTool({
  description:
    "List local and remote Git branches in the active project sandbox, including the current branch. This is read-only.",
  inputSchema: z.object({}),
  execute: trackTool("git_branches", async (_input, ctx) => {
    const sandbox = await ctx.getSandbox();
    return sandbox.run({
      command:
        "git branch --all --format='%(if)%(HEAD)%(then)*%(else) %(end)%(refname:short)\t%(upstream:short)'",
    });
  }),
});