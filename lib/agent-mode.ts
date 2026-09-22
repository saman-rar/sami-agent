export const AGENT_MODES = ["plan", "build"] as const;

export type AgentMode = (typeof AGENT_MODES)[number];

export const DEFAULT_AGENT_MODE: AgentMode = "build";

export function isAgentMode(value: unknown): value is AgentMode {
  return typeof value === "string" && AGENT_MODES.includes(value as AgentMode);
}

export function normalizeAgentMode(value: unknown): AgentMode {
  return isAgentMode(value) ? value : DEFAULT_AGENT_MODE;
}
