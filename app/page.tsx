import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthenticatedAgentChat } from './_components/authenticated-agent-chat';
import { SignIn } from './_components/web-chat-auth';
import { auth } from '@/lib/auth';
import { isConfiguredOwner } from '@/lib/persistence/single-owner';
import {
  listSavedSessions,
  restoreWorkspaceState,
} from '@/lib/sessions/service';
import { AppSidebar } from '@/components/app-sidebar';
import { listProjects } from '@/lib/projects/service';
import { SidebarInset } from '@/components/ui/sidebar';

export default async function Page() {
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
        <AuthenticatedAgentChat />
      </SidebarInset>
    </>
  );
}
