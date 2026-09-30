import { and, desc, eq, sql } from 'drizzle-orm';
import { withDatabase } from '@/lib/db';
import { projects, sessions, workspace, deletedSessions, agentSettings } from '@/lib/db/schema';
import type { SessionRecord, WorkspaceState } from './types';
function toSession(row: typeof sessions.$inferSelect): SessionRecord {
  return { id: row.id, title: row.title, projectId: row.projectId ?? undefined, projectName: row.projectName ?? undefined,
    agentMode: row.agentMode ?? undefined, archived: row.archived, createdAt: row.createdAt, updatedAt: row.updatedAt };
}
export async function listSessions(options: { projectId?: string; includeArchived?: boolean; limit?: number; offset?: number } = {}): Promise<SessionRecord[]> {
  return withDatabase(async db => (await db.select().from(sessions)
    .where(and(options.projectId ? eq(sessions.projectId, options.projectId) : undefined, options.includeArchived ? undefined : eq(sessions.archived, false)))
    .orderBy(desc(sessions.updatedAt), desc(sessions.id)).limit(Math.min(Math.max(options.limit ?? 100, 1), 200)).offset(Math.max(options.offset ?? 0, 0))).map(toSession));
}
export async function getSessionRecord(id: string): Promise<SessionRecord | undefined> {
  return withDatabase(async db => { const [row] = await db.select().from(sessions).where(eq(sessions.id, id)); return row ? toSession(row) : undefined; });
}
export async function isSessionDeleted(id: string): Promise<boolean> {
  return withDatabase(async db => { const [row] = await db.select({ id: deletedSessions.id }).from(deletedSessions).where(eq(deletedSessions.id, id)); return Boolean(row); });
}
export async function upsertSessionRecord(input: { sessionId: string; projectId?: string; projectName?: string; title?: string; agentMode?: SessionRecord['agentMode']; activate?: boolean }): Promise<SessionRecord> {
  return withDatabase(db => db.transaction(async tx => {
    const [project] = input.projectId ? await tx.select().from(projects).where(eq(projects.id, input.projectId)).for('update') : [];
    if (input.projectId && !project) throw new Error('Project not found.');
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.sessionId}, 0))`);
    const [deleted] = await tx.select().from(deletedSessions).where(eq(deletedSessions.id, input.sessionId));
    if (deleted) throw new Error('This session has been permanently deleted. Start a new chat.');
    const [current] = await tx.select().from(sessions).where(eq(sessions.id, input.sessionId));
    if (current && (current.projectId ?? undefined) !== input.projectId) throw new Error('Session belongs to a different workspace.');
    const now = new Date().toISOString();
    const title = input.title?.trim();
    const [settings] = await tx.select().from(agentSettings).where(eq(agentSettings.id, 'owner'));
    const values = {
      id: input.sessionId, eveSessionId: input.sessionId, projectId: input.projectId ?? null, projectName: project?.name ?? null,
      title: title && (!current || current.title === 'New chat' || current.title === current.projectName) ? title : current?.title ?? project?.name ?? 'New chat',
      agentMode: input.agentMode ?? current?.agentMode ?? null, selection: settings?.selection ?? null,
      archived: current?.archived ?? false, createdAt: current?.createdAt ?? now, updatedAt: now,
    };
    const [next] = await tx.insert(sessions).values(values).onConflictDoUpdate({ target: sessions.id, set: values }).returning();
    if (input.activate !== false) {
      const active = { lastSessionId: next.id, lastProjectId: next.projectId, updatedAt: now };
      await tx.insert(workspace).values({ id: 'owner', ...active }).onConflictDoUpdate({ target: workspace.id, set: active });
      if (project) await tx.update(projects).set({ sessionId: next.id, updatedAt: now }).where(eq(projects.id, project.id));
    }
    return toSession(next);
  }));
}
export async function updateSessionRecord(id: string, patch: { title?: string; agentMode?: SessionRecord['agentMode'] }): Promise<SessionRecord> {
  return withDatabase(db => db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${id}, 0))`);
    const [row] = await tx.update(sessions).set({ ...(patch.title?.trim() ? { title: patch.title.trim() } : {}),
      ...(patch.agentMode ? { agentMode: patch.agentMode } : {}), updatedAt: new Date().toISOString() }).where(eq(sessions.id, id)).returning();
    if (!row) throw new Error('Session not found.');
    return toSession(row);
  }));
}
export async function deleteSessionRecord(id: string): Promise<void> {
  await withDatabase(db => db.transaction(async tx => {
    const [session] = await tx.select().from(sessions).where(eq(sessions.id, id));
    if (session?.projectId) await tx.select().from(projects).where(eq(projects.id, session.projectId)).for('update');
    await tx.update(projects).set({ sessionId: null }).where(eq(projects.sessionId, id));
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${id}, 0))`);
    await tx.insert(deletedSessions).values({ id, deletedAt: new Date().toISOString() }).onConflictDoNothing();
    await tx.delete(sessions).where(eq(sessions.id, id));
  }));
}
export async function readWorkspaceState(): Promise<WorkspaceState> {
  return withDatabase(async db => {
    const [row] = await db.select().from(workspace).where(eq(workspace.id, 'owner'));
    if (!row?.lastSessionId) return {};
    return { lastSessionId: row.lastSessionId, lastProjectId: row.lastProjectId ?? undefined, updatedAt: row.updatedAt ?? undefined,
      lastPath: row.lastProjectId ? `/projects/${encodeURIComponent(row.lastProjectId)}?session=${encodeURIComponent(row.lastSessionId)}` : `/s/${encodeURIComponent(row.lastSessionId)}` };
  });
}
