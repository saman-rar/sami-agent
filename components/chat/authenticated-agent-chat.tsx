import { AgentChat } from './agent-chat';
import type { AgentMode } from '@/lib/agent-mode';
import type { ProjectRecord } from '@/lib/projects/types';

export async function AuthenticatedAgentChat({
  sessionId,
  sessionless,
  project,
  initialAgentMode,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
  readonly project?: ProjectRecord;
  readonly initialAgentMode?: AgentMode;
}) {
  return (
    <>
      <AgentChat
        initialAgentMode={initialAgentMode}
        project={project}
        sessionId={sessionId}
        sessionless={sessionless}
      />
    </>
  );
}
