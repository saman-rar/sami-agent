import { defineTool } from "eve/tools";
import { z } from "zod";

import { refreshGitHubCredentialBroker } from "../lib/github-broker";

import { trackTool } from "@/lib/analytics/tool-tracker";

export default defineTool({
  description:
    "Fetch updated refs from a Git remote for the active project sandbox without changing the checked-out working tree. Use this before comparing against remote branches or when the user asks to refresh remote state.",
  inputSchema: z.object({
    remote: z.string().min(1).max(200).default("origin"),
    prune: z.boolean().default(true),
  }),
  execute: trackTool("git_fetch", async ({ remote, prune }, ctx) => {
    await refreshGitHubCredentialBroker(ctx);
    const sandbox = await ctx.getSandbox();
    const pruneFlag = prune ? " --prune" : "";
    return sandbox.run({
      command: `git fetch${pruneFlag} ${remote}`,
    });
  }),
});