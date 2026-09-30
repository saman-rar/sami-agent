import { AuthenticatedAgentChat } from '@/components/chat/authenticated-agent-chat';
import { SignIn } from '@/components/chat/web-chat-auth';
import { auth } from '@/lib/auth';
import { isConfiguredOwner } from '@/lib/persistence/single-owner';
import { restoreWorkspaceState } from '@/lib/sessions/service';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isConfiguredOwner(session.user.email)) redirect('/sign-in');

  const workspace = await restoreWorkspaceState(session.user.id);
  if (workspace.lastPath) redirect(workspace.lastPath);

  return <AuthenticatedAgentChat />;
}
