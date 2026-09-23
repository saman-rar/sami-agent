import type { AgentMode } from "@/lib/agent-mode";

export type SessionRecord = {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  agentMode?: AgentMode;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceState = {
  lastSessionId?: string;
  lastProjectId?: string;
  lastPath?: string;
  updatedAt?: string;
};
