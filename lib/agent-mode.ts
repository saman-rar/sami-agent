export const AGENT_MODES = ["plan", "ask", "build"] as const;

export type AgentMode = (typeof AGENT_MODES)[number];

export const DEFAULT_AGENT_MODE: AgentMode = "build";

export const AGENT_MODE_LABELS: Record<AgentMode, string> = {
  plan: "Plan",
  ask: "Ask",
  build: "Build",
};

export const AGENT_MODE_DESCRIPTIONS: Record<AgentMode, string> = {
  plan: "Explore the codebase, design the approach, and persist an actionable todo plan.",
  ask: "Explore deeply and answer completely without changing the project.",
  build: "Implement the goal, complete existing todos, validate, commit, and push.",
};

export const AGENT_MODE_TURN_INSTRUCTIONS: Record<AgentMode, string> = {
  plan:
    "Plan mode: inspect and reason without modifying the project. For non-trivial work, create or replace the internal todo plan with concrete implementation steps. Do not edit project files or perform Git writes.",
  ask:
    "Ask mode: explore the project as deeply as needed and answer the user's question completely. Do not edit project files, create implementation todos, or perform Git writes.",
  build:
    "Build mode: implement the complete requested goal. Read and complete any existing internal todo plan when relevant. After the whole goal is complete, run both type and lint validation. Only when both succeed, review the diff, stage changes, commit with an accurate message, and push the current branch, subject to Agent Permissions.",
};

export function isAgentMode(value: unknown): value is AgentMode {
  return typeof value === "string" && AGENT_MODES.includes(value as AgentMode);
}

export function normalizeAgentMode(value: unknown): AgentMode {
  return isAgentMode(value) ? value : DEFAULT_AGENT_MODE;
}
