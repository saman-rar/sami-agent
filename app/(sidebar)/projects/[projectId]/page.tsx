import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { AuthenticatedAgentChat } from '@/components/chat/authenticated-agent-chat';
import { SignIn } from '@/components/chat/web-chat-auth';
import { auth } from '@/lib/auth';
import { isConfiguredOwner } from '@/lib/persistence/single-owner';
import type { AgentMode } from '@/lib/agent-mode';
import { getProjectForUser } from '@/lib/projects/service';
import { getSessionRecord } from '@/lib/sessions/store';

export default async function ProjectWorkspacePage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ projectId: string }>;
  readonly searchParams: Promise<{ new?: string; session?: string }>;
}) {
  let userId = 'local-dev';
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !isConfiguredOwner(session.user.email)) return <SignIn />;
    userId = session.user.id;
  }

  const { projectId } = await params;
  const project = await getProjectForUser(userId, projectId);
  if (!project) notFound();

  const query = await searchParams;
  const startNew = query.new === '1';
  let selectedSessionId = startNew ? undefined : project.sessionId;
  let initialAgentMode: AgentMode | undefined;

  if (!startNew && query.session) {
    const requested = await getSessionRecord(query.session);
    if (requested?.projectId === project.id && !requested.archived) {
      selectedSessionId = requested.id;
      initialAgentMode = requested.agentMode;
    }
  } else if (selectedSessionId) {
    initialAgentMode = (await getSessionRecord(selectedSessionId))?.agentMode;
  }

  return (
    <AuthenticatedAgentChat
      initialAgentMode={initialAgentMode}
      project={project}
      sessionId={selectedSessionId}
      sessionless={startNew || !selectedSessionId}
    />
  );
}
