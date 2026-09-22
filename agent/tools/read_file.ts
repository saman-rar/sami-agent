import { defineTool } from "eve/tools";
import { readFile } from "eve/tools/read_file";

import { requireProjectMutationApproval } from "../lib/approval-policy";
import { trackTool } from "@/lib/analytics/tool-tracker";

export default defineTool({
  ...readFile,
  description:
    "Read a file from the active project sandbox. Use this before editing files so changes follow the codebase's actual APIs, patterns, and instructions.",
  approval: requireProjectMutationApproval,
  execute: trackTool("read_file", readFile.execute),
});