import { notFound, redirect } from 'next/navigation';
import { AuthenticatedAgentChat } from '@/components/chat/authenticated-agent-chat';
import { getSessionRecord } from '@/lib/sessions/store';

export default async function SessionPage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>;
}) {
  const { sessionId } = await params;
  const record = await getSessionRecord(sessionId);
  if (!record) notFound();
  if (record.projectId) redirect(`/projects/${encodeURIComponent(record.projectId)}?session=${encodeURIComponent(record.id)}`);
  return (
    <AuthenticatedAgentChat
      initialAgentMode={record?.agentMode}
      sessionId={sessionId}
    />
  );
}
