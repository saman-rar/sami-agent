import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { isConfiguredOwner } from '@/lib/persistence/single-owner';
import { AgentChat } from './agent-chat';
import type { AgentMode } from '@/lib/agent-mode';
import type { ProjectRecord } from '@/lib/projects/types';
import { SignIn } from './web-chat-auth';

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
