import { defineTool } from "eve/tools";
import { withToolAnalytics } from "@/lib/analytics/tool-wrapper";
import { writeFile } from "eve/tools/write_file";
import { requireProjectMutationApproval } from "../lib/approval-policy";

export default defineTool({
  ...writeFile,
  description:
    "Create or replace a file inside the active project sandbox. Inspect related files and existing project patterns before writing. Keep changes focused and never write outside the project workspace.",
  approval: requireProjectMutationApproval,
});
