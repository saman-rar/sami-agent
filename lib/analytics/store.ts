import { ownerStoragePath } from "@/lib/persistence/single-owner";
import { readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import type {
  LLMRequestMetric,
  MCPExecutionMetric,
  SkillUsageMetric,
  ToolExecutionMetric,
} from "./types";

const PATH = ownerStoragePath("analytics/runtime", 1);

export type AnalyticsStore = {
  llm: LLMRequestMetric[];
  tools: ToolExecutionMetric[];
  mcp: MCPExecutionMetric[];
  skills: SkillUsageMetric[];
};

const empty = (): AnalyticsStore => ({
  llm: [],
  tools: [],
  mcp: [],
  skills: [],
});

export async function appendAnalytics(
  type: keyof AnalyticsStore,
  value:
    | LLMRequestMetric
    | ToolExecutionMetric
    | MCPExecutionMetric
    | SkillUsageMetric,
) {
  const current = (await readPrivateJson<AnalyticsStore>(PATH)) ?? empty();

  if (type === "llm") {
    current.llm = [...current.llm, value as LLMRequestMetric].slice(-500);
  } else if (type === "tools") {
    current.tools = [...current.tools, value as ToolExecutionMetric].slice(-500);
  } else if (type === "mcp") {
    current.mcp = [...current.mcp, value as MCPExecutionMetric].slice(-500);
  } else {
    current.skills = [...current.skills, value as SkillUsageMetric].slice(-500);
  }

  await writePrivateJson(PATH, current);
}

export async function readAnalyticsStore() {
  return (await readPrivateJson<AnalyticsStore>(PATH)) ?? empty();
}
