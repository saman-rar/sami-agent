export const AGENT_PERMISSION_MODES = ["no-access", "ask-before", "full-access"] as const;

export type AgentPermissionMode = (typeof AGENT_PERMISSION_MODES)[number];

export type AgentPermissionSettings = {
  mode: AgentPermissionMode;
  updatedAt?: string;
};
