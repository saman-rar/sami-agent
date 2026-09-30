import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireProjectMutationApproval } from "../lib/approval-policy";
import { shellArgs, shellQuote } from "../lib/shell";

export default defineTool({
  description:
    "Stage selected project changes and create a Git commit inside the active sandbox. In Build mode, use this only after the complete goal is implemented, validate_project has passed both type and lint checks, and git status/diff have been reviewed. This is approval-protected. It never pushes the commit.",
  inputSchema: z.object({
    message: z.string().min(1).max(500),
    paths: z
      .array(z.string().min(1))
      .max(100)
      .optional()
      .describe("Repository-relative paths to stage. Omit to stage all working-tree changes."),
  }),
  approval: requireProjectMutationApproval,
  async execute({ message, paths }, ctx) {
    const sandbox = await ctx.getSandbox();
    const stage = paths?.length ? `git add -- ${shellArgs(paths)}` : "git add -A";
    return sandbox.run({
      command: `${stage} && git commit -m ${shellQuote(message)}`,
    });
  },
});
