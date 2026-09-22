import { ownerStoragePath } from "@/lib/persistence/single-owner";
import { readPrivateJson, writePrivateJson } from "@/lib/persistence/blob";
import type { SessionRecord, WorkspaceState } from "./types";

const DOCUMENT_VERSION = 1 as const;

type SessionDocument = {
  version: typeof DOCUMENT_VERSION;
  sessions: SessionRecord[];
  workspace: WorkspaceState;
};

const STORAGE_PATH = ownerStoragePath("sessions", DOCUMENT_VERSION);

function emptyDocument(): SessionDocument {
  return { version: DOCUMENT_VERSION, sessions: [], workspace: {} };
}

async function readDocument(): Promise<SessionDocument> {
  const document = await readPrivateJson<SessionDocument>(STORAGE_PATH);
  if (!document) return emptyDocument();
  if (document.version !== DOCUMENT_VERSION || !Array.isArray(document.sessions)) {
    throw new Error("Session persistence has an unsupported format.");
  }
  return document;
}

async function writeDocument(document: SessionDocument): Promise<void> {
  await writePrivateJson(STORAGE_PATH, document);
}

export async function listSessions(options: {
  projectId?: string;
  includeArchived?: boolean;
} = {}): Promise<SessionRecord[]> {
  const document = await readDocument();
  return document.sessions
    .filter((session) => options.includeArchived || !session.archived)
    .filter((session) => !options.projectId || session.projectId === options.projectId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSessionRecord(sessionId: string): Promise<SessionRecord | undefined> {
  return (await readDocument()).sessions.find((session) => session.id === sessionId);
}

export async function upsertSessionRecord(input: {
  sessionId: string;
  projectId?: string;
  projectName?: string;
  title?: string;
  agentMode?: SessionRecord["agentMode"];
  activate?: boolean;
}): Promise<SessionRecord> {
  const document = await readDocument();
  const now = new Date().toISOString();
  const index = document.sessions.findIndex((session) => session.id === input.sessionId);
  const current = index >= 0 ? document.sessions[index] : undefined;
  const title = input.title?.trim();
  const shouldAdoptTitle = Boolean(
    title &&
      (!current || current.title === "New chat" || current.title === current.projectName),
  );
  const next: SessionRecord = {
    id: input.sessionId,
    title: shouldAdoptTitle ? title! : current?.title || input.projectName || "New chat",
    projectId: input.projectId ?? current?.projectId,
    projectName: input.projectName ?? current?.projectName,
    agentMode: input.agentMode ?? current?.agentMode,
    archived: false,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
  };

  if (index >= 0) document.sessions[index] = next;
  else document.sessions.push(next);

  if (input.activate !== false) {
    document.workspace = {
      lastSessionId: next.id,
      lastProjectId: next.projectId,
      lastPath: next.projectId
        ? `/projects/${encodeURIComponent(next.projectId)}`
        : `/s/${encodeURIComponent(next.id)}`,
      updatedAt: now,
    };
  }
  await writeDocument(document);
  return next;
}

export async function updateSessionRecord(
  sessionId: string,
  patch: { title?: string; archived?: boolean; agentMode?: SessionRecord["agentMode"] },
): Promise<SessionRecord> {
  const document = await readDocument();
  const index = document.sessions.findIndex((session) => session.id === sessionId);
  if (index < 0) throw new Error("Session not found.");
  const current = document.sessions[index];
  const next: SessionRecord = {
    ...current,
    ...(patch.title !== undefined ? { title: patch.title.trim() || current.title } : {}),
    ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
    ...(patch.agentMode !== undefined ? { agentMode: patch.agentMode } : {}),
    updatedAt: new Date().toISOString(),
  };
  document.sessions[index] = next;
  if (patch.archived === true && document.workspace.lastSessionId === sessionId) {
    document.workspace = {};
  }
  await writeDocument(document);
  return next;
}

export async function readWorkspaceState(): Promise<WorkspaceState> {
  return (await readDocument()).workspace;
}
