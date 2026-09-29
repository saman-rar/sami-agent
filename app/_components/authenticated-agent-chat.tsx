import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { AgentChat } from './agent-chat';
import type { AgentMode } from '@/lib/agent-mode';
import type { ProjectRecord } from '@/lib/projects/types';
import { SidebarInset } from '@/components/ui/sidebar';
import { auth } from '@/lib/auth';
import { isConfiguredOwner } from '@/lib/persistence/single-owner';
import {
  listSavedSessions,
  restoreWorkspaceState,
} from '@/lib/sessions/service';
import { listProjects } from '@/lib/projects/service';
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
  let userId = 'local-dev';
  let user = {
    name: 'Developer',
    email: 'test@test.dev',
    avatar: '',
  };
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !isConfiguredOwner(session.user.email)) return <SignIn />;
    userId = session.user.id;
    user = {
      name: session.user.name,
      email: session.user.email,
      avatar: session.user.image ?? '',
    };
  }

  const workspace = await restoreWorkspaceState(userId);
  if (workspace.lastPath) redirect(workspace.lastPath);

  return (
    <>
      <AppSidebar
        user={user}
        projects={await listProjects(userId)}
        sessions={await listSavedSessions(userId)}
      />
      <SidebarInset>
        <AgentChat
          initialAgentMode={initialAgentMode}
          project={project}
          sessionId={sessionId}
          sessionless={sessionless}
        />
      </SidebarInset>
    </>
  );
}
