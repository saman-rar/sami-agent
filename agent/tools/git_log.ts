import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Read recent Git commit history from the active project sandbox. Use it to understand conventions or recent work without modifying the repository.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(20),
  }),
  async execute({ limit }, ctx) {
    const sandbox = await ctx.getSandbox();
    return sandbox.run({
      command: `git log -${limit} --date=iso-strict --pretty=format:'%h%x09%ad%x09%an%x09%s'`,
    });
  },
});
