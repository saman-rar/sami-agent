import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireProjectMutationApproval } from "../lib/approval-policy";
import { refreshGitHubCredentialBroker } from "../lib/github-broker";
import { shellQuote } from "../lib/shell";

export default defineTool({
  description:
    "Push the current Git HEAD from the active project sandbox to a remote. Never call this silently; inspect status/diff and ensure the user requested the remote mutation. This is always approval-protected by Agent Permissions.",
  inputSchema: z.object({
    remote: z.string().min(1).max(200).default("origin"),
    setUpstream: z.boolean().default(true),
  }),
  approval: requireProjectMutationApproval,
  async execute({ remote, setUpstream }, ctx) {
    await refreshGitHubCredentialBroker(ctx);
    const sandbox = await ctx.getSandbox();
    return sandbox.run({
      command: `git push${setUpstream ? " --set-upstream" : ""} ${shellQuote(remote)} HEAD`,
    });
  },
});
