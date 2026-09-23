import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "List local and remote Git branches in the active project sandbox, including the current branch. This is read-only.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const sandbox = await ctx.getSandbox();
    return sandbox.run({
      command:
        "git branch --all --format='%(if)%(HEAD)%(then)*%(else) %(end)%(refname:short)\t%(upstream:short)'",
    });
  },
});
