import { defineTool } from "eve/tools";
import { z } from "zod";
import { shellArgs } from "../lib/shell";

export default defineTool({
  description:
    "Inspect the current Git diff in the active project sandbox. Use this after edits and before reporting or committing changes. Optionally limit the diff to specific paths or staged changes. This is read-only.",
  inputSchema: z.object({
    staged: z.boolean().default(false).describe("Show the staged diff instead of unstaged changes."),
    paths: z
      .array(z.string().min(1))
      .max(50)
      .optional()
      .describe("Optional repository-relative paths to include."),
  }),
  async execute({ staged, paths }, ctx) {
    const sandbox = await ctx.getSandbox();
    const pathArgs = paths?.length ? ` -- ${shellArgs(paths)}` : "";
    const stagedFlag = staged ? " --cached" : "";
    return sandbox.run({
      command: `git diff --no-ext-diff --unified=3${stagedFlag}${pathArgs}`,
    });
  },
});
