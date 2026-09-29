'use client';

import type { UserContent } from 'ai';
import { useEveAgent } from 'eve/react';
import {
  AlertCircleIcon,
  BrainIcon,
  FolderGit2Icon,
  GitBranchIcon,
  HistoryIcon,
  PanelLeftIcon,
  PlusIcon,
  SettingsIcon,
  SquareIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationTopFade,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { AgentModeSelector } from '@/components/ai-elements/agent-mode-selector';
import { ModelSelector } from '@/components/ai-elements/model-selector';
import { Button } from '@/components/ui/button';
import { DEFAULT_AGENT_MODE, type AgentMode } from '@/lib/agent-mode';
import type { ProjectRecord } from '@/lib/projects/types';
import { GitHubBrandIcon } from '@/components/icons/github-brand-icon';
import { cn } from '@/lib/utils';
import { AgentMessage } from './agent-message';
import { useSidebar } from '@/components/ui/sidebar';

const AGENT_NAME = 'sami';

export function AgentChat({
  sessionId,
  sessionless = false,
  project,
  initialAgentMode = DEFAULT_AGENT_MODE,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
  readonly project?: ProjectRecord;
  readonly initialAgentMode?: AgentMode;
}) {
  const [cancellationError, setCancellationError] = useState<string>();
  const [hasInputText, setHasInputText] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>(initialAgentMode);
  const agentModeRef = useRef<AgentMode>(initialAgentMode);
  const pendingTitleRef = useRef<string | undefined>(undefined);

  const persistSessionMetadata = async (activeId: string, title?: string) => {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: activeId,
        title,
        projectId: project?.id,
        projectName: project?.name,
        agentMode: agentModeRef.current,
      }),
    });
    if (!response.ok) throw new Error('Unable to persist the session.');
  };
  const agent = useEveAgent({
    headers: async () => ({
      'x-sami-agent-mode': agentModeRef.current,
      ...(project ? { 'x-sami-project-id': project.id } : {}),
    }),
    initialSession:
      sessionId === undefined
        ? undefined
        : {
            sessionId,
            streamIndex: 0,
          },
    resume: sessionId !== undefined,
    onSessionChange(session) {
      if (session === undefined) return;

      void persistSessionMetadata(
        session.sessionId,
        pendingTitleRef.current,
      ).catch((error: unknown) => setCancellationError(toErrorMessage(error)));

      if (sessionId === undefined) {
        if (project) {
          void fetch(
            `/api/projects/${encodeURIComponent(project.id)}/session`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: session.sessionId }),
            },
          )
            .then((response) => {
              if (!response.ok)
                throw new Error('Unable to persist the project session.');
              History.prototype.replaceState.call(
                window.history,
                window.history.state,
                '',
                `/projects/${encodeURIComponent(project.id)}`,
              );
            })
            .catch((error: unknown) =>
              setCancellationError(toErrorMessage(error)),
            );
          return;
        }

        // Next patches window.history to navigate, which would detach the active stream.
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          '',
          `/s/${encodeURIComponent(session.sessionId)}`,
        );
      }
    },
  });

  const isBusy = agent.status === 'submitted' || agent.status === 'streaming';
  const isResuming = agent.status === 'resuming';
  const isEmpty = agent.data.messages.length === 0;
  const lastMessage = agent.data.messages.at(-1);
  const isPendingAssistantShell =
    lastMessage?.role === 'assistant' &&
    lastMessage.parts.every((part) => part.type === 'step-start');
  const showPendingThinking =
    isBusy &&
    (agent.status === 'submitted' ||
      lastMessage?.role !== 'assistant' ||
      isPendingAssistantShell);
  const turnFailure =
    isBusy || isResuming ? undefined : getLatestTurnFailure(agent.events);
  const errorMessage = cancellationError ?? agent.error?.message ?? turnFailure;
  const hasConversationContent =
    sessionless || !isEmpty || errorMessage !== undefined;
  const showConversationLayout =
    Boolean(project) || isResuming || hasConversationContent;
  const activeSessionId = sessionId ?? agent.session?.sessionId;

  useEffect(() => {
    if (!activeSessionId) return;
    void persistSessionMetadata(activeSessionId).catch((error: unknown) =>
      setCancellationError(toErrorMessage(error)),
    );
    if (project) {
      void fetch(`/api/projects/${encodeURIComponent(project.id)}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId }),
      }).catch(() => undefined);
    }
    // Project/session identity is stable for this mounted chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, project?.id]);

  const changeAgentMode = (mode: AgentMode) => {
    agentModeRef.current = mode;
    setAgentMode(mode);
    if (activeSessionId) {
      void fetch(`/api/sessions/${encodeURIComponent(activeSessionId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentMode: mode }),
      }).catch(() => undefined);
    }
  };

  const requestCancellation = () => {
    setCancellationError(undefined);
    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isResuming) return;

    setHasInputText(false);
    setCancellationError(undefined);
    const titleCandidate = deriveSessionTitle(
      text,
      message.files.map((file) => file.filename),
    );
    pendingTitleRef.current = titleCandidate;
    if (activeSessionId) {
      void persistSessionMetadata(activeSessionId, titleCandidate).catch(
        (error: unknown) => setCancellationError(toErrorMessage(error)),
      );
    }
    const options = {
      clientContext: {
        samiAgent: {
          mode: agentMode,
          instruction:
            agentMode === 'plan'
              ? 'Inspect and reason only. Do not attempt protected mutations.'
              : 'Implement the requested task using project tools, subject to Agent Permissions.',
        },
        ...(project
          ? {
              samiProject: {
                id: project.id,
                repository: project.source.fullName,
                branch: project.source.branch,
                instruction:
                  'The active Eve sandbox is the selected GitHub repository. Inspect existing project instructions and files before editing.',
              },
            }
          : {}),
      },
      ...(isBusy ? { turnPolicy: 'steer' as const } : {}),
    };

    if (message.files.length === 0) {
      await agent.send(text, options);
      return;
    }

    const parts: UserContent = [];
    if (text.length > 0) {
      parts.push({ text, type: 'text' });
    }
    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: 'file',
      });
    }

    await agent.send(parts, options);
  };

  const composer = (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea
        disabled={isResuming}
        onChange={(event) =>
          setHasInputText(event.currentTarget.value.trim().length > 0)
        }
        placeholder='Send a message…'
      />
      <PromptInputFooter className='pr-12'>
        <div className='flex min-w-0 items-center gap-1'>
          <AgentModeSelector
            disabled={isResuming}
            onValueChange={changeAgentMode}
            value={agentMode}
          />
          <ModelSelector />
        </div>
      </PromptInputFooter>
      <ComposerAction
        hasInputText={hasInputText}
        isBusy={isBusy}
        isResuming={isResuming}
        onCancel={requestCancellation}
      />
    </PromptInput>
  );

  return (
    <main className='flex h-dvh flex-col overflow-hidden bg-background text-foreground'>
      <div className=''>
        <ChatHeader
          canStartNewChat={activeSessionId !== undefined}
          project={project}
        />
      </div>

      {showConversationLayout ? (
        <Conversation
          className='min-h-0 flex-1'
          initial={sessionId === undefined ? undefined : false}
          resize={activeSessionId === undefined ? 'smooth' : 'instant'}
        >
          <ConversationTopFade className='top-14' />
          <ConversationContent className='mx-auto w-full max-w-3xl gap-6 px-4 pt-20 pb-36 sm:px-6'>
            {agent.data.messages.map((message, index) =>
              showPendingThinking &&
              isPendingAssistantShell &&
              message.id === lastMessage.id ? null : (
                <AgentMessage
                  canRespond={!isBusy && !isResuming}
                  isStreaming={
                    agent.status === 'streaming' &&
                    index === agent.data.messages.length - 1
                  }
                  key={message.id}
                  message={message}
                  onInputResponses={(inputResponses) => {
                    setCancellationError(undefined);
                    return agent.respond(inputResponses);
                  }}
                />
              ),
            )}
            {showPendingThinking ? <PendingThinking /> : null}
            {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      ) : null}

      <div
        className={cn(
          'mx-auto w-full px-4 sm:px-6',
          showConversationLayout
            ? 'fixed bottom-0 left-1/2 z-20 max-w-3xl -translate-x-1/2 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-6 lg:left-[calc(50%-10rem)]'
            : 'flex max-w-xl flex-1 flex-col items-center justify-center gap-8 pb-[10vh]',
        )}
      >
        {showConversationLayout ? null : (
          <div className='flex flex-col items-center gap-3 text-center'>
            <h1 className='font-medium text-5xl tracking-tighter'>
              {project?.name ?? AGENT_NAME}
            </h1>
          </div>
        )}
        <div className='w-full'>{composer}</div>
      </div>

      {/* <MonitoringPanel /> */}
    </main>
  );
}

function ComposerAction({
  hasInputText,
  isBusy,
  isResuming,
  onCancel,
}: {
  readonly hasInputText: boolean;
  readonly isBusy: boolean;
  readonly isResuming: boolean;
  readonly onCancel: () => void;
}) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;

  if (!isBusy || canSubmit) {
    return <PromptInputSubmit disabled={isResuming} />;
  }

  return (
    <PromptInputButton
      aria-label='Stop'
      className='absolute right-2.5 bottom-2.5'
      onClick={onCancel}
      variant='outline'
    >
      <SquareIcon className='size-3 fill-current' />
    </PromptInputButton>
  );
}

function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <Message className='max-w-full' from='assistant'>
      <MessageContent>
        <div
          className='flex w-full items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm'
          role='alert'
        >
          <AlertCircleIcon className='mt-0.5 size-4 shrink-0 text-destructive' />
          <div>
            <p className='font-medium'>Request failed</p>
            <p className='mt-0.5 text-muted-foreground'>{message}</p>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

function ChatHeader({
  canStartNewChat,
  project,
}: {
  readonly canStartNewChat: boolean;
  readonly project?: ProjectRecord;
}) {
  const { toggleSidebar } = useSidebar();

  const startNewChat = () => {
    if (!project) {
      window.location.assign('/s');
      return;
    }

    void fetch(`/api/projects/${encodeURIComponent(project.id)}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: null }),
    }).finally(() => {
      window.location.assign(
        `/projects/${encodeURIComponent(project.id)}?new=1`,
      );
    });
  };

  return (
    <header className='pointer-events-none sticky top-0 right-0 left-0 z-10 h-14 border-b bg-sidebar/95 backdrop-blur lg:right-80'>
      <div className='relative mx-auto flex h-full w-full items-center justify-between px-5'>
        <div className='pointer-events-auto'>
          <Button
            data-sidebar='trigger'
            data-slot='sidebar-trigger'
            variant='ghost'
            size='icon'
            className={cn('size-7')}
            onClick={(event) => {
              console.log('first');
              // onClick?.(event);
              toggleSidebar();
            }}
            // {...props}
          >
            <PanelLeftIcon />
            <span className='sr-only'>Toggle Sidebar</span>
          </Button>
        </div>
        {project ? (
          <div className='flex min-w-0 items-center gap-2 text-sm'>
            <GitHubBrandIcon className='size-3.5 shrink-0 text-muted-foreground' />
            <span className='max-w-48 truncate font-medium'>
              {project.source.fullName}
            </span>
            <span className='hidden items-center gap-1 text-xs text-muted-foreground sm:flex'>
              <GitBranchIcon className='size-3' />
              <span className='max-w-32 truncate'>{project.source.branch}</span>
            </span>
          </div>
        ) : (
          <span className='truncate text-muted-foreground text-sm'>
            {AGENT_NAME}
          </span>
        )}
        <div className='pointer-events-auto flex items-center gap-1'>
          <Button
            aria-label='Open chats'
            onClick={() => window.location.assign('/sessions')}
            size='icon-sm'
            type='button'
            variant='ghost'
          >
            <HistoryIcon className='size-4' />
          </Button>
          <Button
            aria-label='Open projects'
            onClick={() => window.location.assign('/projects')}
            size='icon-sm'
            type='button'
            variant='ghost'
          >
            <FolderGit2Icon className='size-4' />
          </Button>
          <Button
            aria-label='Open settings'
            onClick={() => window.location.assign('/settings/providers')}
            size='icon-sm'
            type='button'
            variant='ghost'
          >
            <SettingsIcon className='size-4' />
          </Button>
          {canStartNewChat ? (
            <Button
              aria-label='Start a new chat'
              className='pr-3'
              onClick={startNewChat}
              size='sm'
              type='button'
              variant='ghost'
            >
              <PlusIcon className='size-4' />
              <span className='hidden font-normal text-sm sm:inline'>
                New chat
              </span>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function PendingThinking() {
  return (
    <Message aria-live='polite' from='assistant'>
      <MessageContent>
        <div className='mb-4 flex w-full items-center gap-2 text-muted-foreground text-sm'>
          <BrainIcon className='size-4' />
          <Shimmer duration={1}>Thinking</Shimmer>
        </div>
      </MessageContent>
    </Message>
  );
}

function deriveSessionTitle(
  text: string,
  filenames: Array<string | undefined>,
): string | undefined {
  const source =
    text.trim() ||
    filenames
      .filter((filename): filename is string => Boolean(filename))
      .join(', ');
  if (!source) return undefined;
  const compact = source.replace(/\s+/g, ' ').trim();
  return compact.length > 72 ? `${compact.slice(0, 69)}…` : compact;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to cancel the response.';
}

function getLatestTurnFailure(
  events: ReturnType<typeof useEveAgent>['events'],
): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event.type === 'turn.failed') {
      return event.data.code === 'MODEL_CALL_FAILED'
        ? 'The model is temporarily unavailable. Please try again.'
        : event.data.message;
    }

    if (event.type === 'turn.completed' || event.type === 'turn.cancelled') {
      return undefined;
    }

    if (event.type === 'message.received') {
      return undefined;
    }
  }

  return undefined;
}
