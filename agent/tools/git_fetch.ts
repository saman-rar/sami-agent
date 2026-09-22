import { defineTool } from "eve/tools";
import { z } from "zod";
import { refreshGitHubCredentialBroker } from "../lib/github-broker";
import { shellQuote } from "../lib/shell";

export default defineTool({
  description:
    "Fetch updated refs from a Git remote for the active project sandbox without changing the checked-out working tree. Use this before comparing against remote branches or when the user asks to refresh remote state.",
  inputSchema: z.object({
    remote: z.string().min(1).max(200).default("origin"),
    prune: z.boolean().default(true),
  }),
  async execute({ remote, prune }, ctx) {
    await refreshGitHubCredentialBroker(ctx);
    const sandbox = await ctx.getSandbox();
    return sandbox.run({
      command: `git fetch${prune ? " --prune" : ""} ${shellQuote(remote)}`,
    });
  },
});
