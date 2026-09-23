import type {
  LLMRequestMetric,
  MCPExecutionMetric,
  SkillUsageMetric,
  ToolExecutionMetric,
} from "./types";

const events = {
  llm: [] as LLMRequestMetric[],
  tools: [] as ToolExecutionMetric[],
  mcp: [] as MCPExecutionMetric[],
  skills: [] as SkillUsageMetric[],
};

export const analyticsTracker = {
  recordLLM(metric: LLMRequestMetric) {
    events.llm.push(metric);
  },

  recordTool(metric: ToolExecutionMetric) {
    events.tools.push(metric);
  },

  recordMCP(metric: MCPExecutionMetric) {
    events.mcp.push(metric);
  },

  recordSkill(metric: SkillUsageMetric) {
    events.skills.push(metric);
  },

  snapshot() {
    return events;
  },

  clear() {
    events.llm.length = 0;
    events.tools.length = 0;
    events.mcp.length = 0;
    events.skills.length = 0;
  },
};
