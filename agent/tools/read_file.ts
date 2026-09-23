import { defineTool } from "eve/tools";
import { withToolAnalytics } from "@/lib/analytics/tool-wrapper";
import { readFile } from "eve/tools/read_file";

export default defineTool({
  ...readFile,
  description:
    "Read a file from the active project sandbox. Use this before editing files so changes follow the codebase's actual APIs, patterns, and instructions.",
});
