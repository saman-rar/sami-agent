'use client';

import {
  Trash2Icon,
  FolderGit2Icon,
  GitBranchIcon,
  MessageSquareIcon,
  PlusIcon,
  SettingsIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DeleteDialog, type DeleteTarget } from '@/components/persistence/delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SessionRecord } from '@/lib/sessions/types';
import Link from 'next/link';

export function SessionDashboard({
  initialSessions,
}: {
  readonly initialSessions: SessionRecord[];
}) {
  const [sessions, setSessions] = useState(initialSessions);

  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string>();
  const [hasMore, setHasMore] = useState(initialSessions.length === 100);
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  useEffect(() => { setSessions(initialSessions); setHasMore(initialSessions.length === 100); }, [initialSessions]);

  async function loadMore() {
    setLoadingMore(true); setMoreError(undefined);
    try {
      const response = await fetch(`/api/sessions?limit=100&offset=${sessions.length}`, { cache: 'no-store' });
      const body: { sessions?: SessionRecord[]; error?: string } = await response.json();
      if (!response.ok || !body.sessions) throw new Error(body.error ?? 'Unable to load more chats.');
      const incoming = body.sessions;
      setSessions(current => [...current, ...incoming.filter(item => !current.some(existing => existing.id === item.id))]);
      setHasMore(incoming.length === 100);
    } catch (error) { setMoreError(error instanceof Error ? error.message : 'Unable to load more chats.'); }
    finally { setLoadingMore(false); }
  }

  return (
    <main className='min-h-dvh bg-background text-foreground'>
      <div className='mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12'>
        <div className='mb-8 flex items-start justify-between gap-4'>
          <div>
            <div className='mb-2 font-mono text-xs text-muted-foreground'>
              SAMI / CHATS
            </div>
            <h1 className='text-2xl font-semibold tracking-tight'>Chats</h1>
            <p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>
              Durable Eve sessions saved for this Sami deployment. Open the same
              conversation from any authenticated device.
            </p>
          </div>
          <Button asChild>
            <Link href={'/s'}>
              <PlusIcon data-icon='inline-start' /> New chat
            </Link>
          </Button>
        </div>

        <div className='overflow-hidden rounded-md border bg-panel'>
          <div className='flex h-10 items-center border-b px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            Recent chats
          </div>
          {sessions.length === 0 ? (
            <div className='flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center'>
              <MessageSquareIcon className='size-5 text-muted-foreground' />
              <div>
                <p className='text-sm font-medium'>No saved chats yet</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Start a conversation and it will appear here on every device.
                </p>
              </div>
            </div>
          ) : (
            <div className='divide-y'>
              {sessions.map((session) => {
                const href = session.projectId
                  ? `/projects/${encodeURIComponent(session.projectId)}?session=${encodeURIComponent(session.id)}`
                  : `/s/${encodeURIComponent(session.id)}`;
                return (
                  <div
                    className='flex items-center gap-2 px-4 py-3'
                    key={session.id}
                  >
                    <button
                      className='min-w-0 flex-1 text-left'
                      onClick={() => window.location.assign(href)}
                      type='button'
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        <MessageSquareIcon className='size-4 shrink-0 text-muted-foreground' />
                        <span className='truncate text-sm font-medium'>
                          {session.title}
                        </span>
                        {session.agentMode ? (
                          <Badge
                            className='shrink-0 capitalize'
                            variant='outline'
                          >
                            {session.agentMode}
                          </Badge>
                        ) : null}
                      </div>
                      <div className='mt-1 flex items-center gap-1.5 pl-6 text-xs text-muted-foreground'>
                        {session.projectName ? (
                          <>
                            <GitBranchIcon className='size-3' />
                            <span className='truncate'>
                              {session.projectName}
                            </span>
                            <span aria-hidden='true'>·</span>
                          </>
                        ) : null}
                        <span>{formatDate(session.updatedAt)}</span>
                      </div>
                    </button>
                    <Button
                      aria-label={`Delete ${session.title}`}
                      onClick={() => setTarget({ kind: 'session', id: session.id, name: session.title })}
                      size='icon-sm'
                      type='button'
                      variant='ghost'
                    >
                      <Trash2Icon className='size-4' />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {moreError ? <p role='alert' className='mt-3 text-sm text-destructive'>{moreError}</p> : null}
        {hasMore ? <Button className='mt-3' variant='outline' disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'Loading…' : 'Load more chats'}</Button> : null}
        <div className='mt-5 flex items-center gap-1'>
          <Button
            onClick={() => window.location.assign('/projects')}
            size='sm'
            variant='ghost'
          >
            <FolderGit2Icon data-icon='inline-start' /> Projects
          </Button>
          <Button
            onClick={() => window.location.assign('/settings/providers')}
            size='sm'
            variant='ghost'
          >
            <SettingsIcon data-icon='inline-start' /> Settings
          </Button>
        </div>
      </div>
      <DeleteDialog target={target} onClose={() => setTarget(null)} onDeleted={id => setSessions(items => items.filter(item => item.id !== id))} />
    </main>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
