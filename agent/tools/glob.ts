import { defineTool } from "eve/tools";
import { glob } from "eve/tools/glob";

import { trackTool } from "@/lib/analytics/tool-tracker";

export default defineTool({
  ...glob,
  execute: trackTool("glob", glob.execute),
});