"use client";

import {
  ArchiveIcon,
  FolderGit2Icon,
  GitBranchIcon,
  MessageSquareIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionRecord } from "@/lib/sessions/types";

export function SessionDashboard({ initialSessions }: { readonly initialSessions: SessionRecord[] }) {
  const [sessions, setSessions] = useState(initialSessions);

  const archiveSession = async (sessionId: string) => {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (response.ok) setSessions((current) => current.filter((item) => item.id !== sessionId));
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 font-mono text-xs text-muted-foreground">SAMI / CHATS</div>
            <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Durable Eve sessions saved for this Sami deployment. Open the same conversation from
              any authenticated device.
            </p>
          </div>
          <Button onClick={() => window.location.assign("/s")} type="button">
            <PlusIcon data-icon="inline-start" /> New chat
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border bg-panel">
          <div className="flex h-10 items-center border-b px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent chats
          </div>
          {sessions.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 text-center">
              <MessageSquareIcon className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">No saved chats yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start a conversation and it will appear here on every device.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => {
                const href = session.projectId
                  ? `/projects/${encodeURIComponent(session.projectId)}?session=${encodeURIComponent(session.id)}`
                  : `/s/${encodeURIComponent(session.id)}`;
                return (
                  <div className="flex items-center gap-2 px-4 py-3" key={session.id}>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => window.location.assign(href)}
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <MessageSquareIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">{session.title}</span>
                        {session.agentMode ? (
                          <Badge className="shrink-0 capitalize" variant="outline">
                            {session.agentMode}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 pl-6 text-xs text-muted-foreground">
                        {session.projectName ? (
                          <>
                            <GitBranchIcon className="size-3" />
                            <span className="truncate">{session.projectName}</span>
                            <span aria-hidden="true">·</span>
                          </>
                        ) : null}
                        <span>{formatDate(session.updatedAt)}</span>
                      </div>
                    </button>
                    <Button
                      aria-label={`Archive ${session.title}`}
                      onClick={() => void archiveSession(session.id)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <ArchiveIcon className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-1">
          <Button onClick={() => window.location.assign("/projects")} size="sm" variant="ghost">
            <FolderGit2Icon data-icon="inline-start" /> Projects
          </Button>
          <Button
            onClick={() => window.location.assign("/settings/providers")}
            size="sm"
            variant="ghost"
          >
            <SettingsIcon data-icon="inline-start" /> Settings
          </Button>
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
