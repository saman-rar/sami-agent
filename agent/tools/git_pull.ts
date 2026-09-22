import { defineTool } from "eve/tools";
import { z } from "zod";

import { requireProjectMutationApproval } from "../lib/approval-policy";
import { refreshGitHubCredentialBroker } from "../lib/github-broker";
import { shellQuote } from "../lib/shell";

import { trackTool } from "@/lib/analytics/tool-tracker";

export default defineTool({
  description:
    "Pull changes from a Git remote into the current branch in the active project sandbox. This can modify the working tree and create merges, so it is approval-protected.",
  inputSchema: z.object({
    remote: z.string().min(1).max(200).default("origin"),
    rebase: z.boolean().default(false),
  }),
  approval: requireProjectMutationApproval,
  execute: trackTool("git_pull", async ({ remote, rebase }, ctx) => {
    await refreshGitHubCredentialBroker(ctx);
    const sandbox = await ctx.getSandbox();
    const rebaseFlag = rebase ? " --rebase" : "";
    return sandbox.run({
      command: `git pull${rebaseFlag} ${remote}`,
    });
  }),
});