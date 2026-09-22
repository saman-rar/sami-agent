import { defineTool } from "eve/tools";
import { grep } from "eve/tools/grep";

import { trackTool } from "@/lib/analytics/tool-tracker";

export default defineTool({
  ...grep,
  execute: trackTool("grep", grep.execute),
});