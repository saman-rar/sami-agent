import { defineTool } from "eve/tools";
import { z } from "zod";

import { requireProjectMutationApproval } from "../lib/approval-policy";

import { trackTool } from "@/lib/analytics/tool-tracker";

export default defineTool({
  description:
    "Switch the active project sandbox to another Git branch, optionally creating it. Inspect status first so uncommitted work is not lost or unexpectedly carried across branches. This modifies repository state and is approval-protected.",
  inputSchema: z.object({
    branch: z.string().min(1).max(200),
    create: z.boolean().default(false),
  }),
  approval: requireProjectMutationApproval,
  execute: trackTool("git_switch_branch", async ({ branch, create }, ctx) => {
    const sandbox = await ctx.getSandbox();
    return sandbox.run({
      command: create
        ? `git switch -c ${branch}`
        : `git switch ${branch}`,
    });
  }),
});