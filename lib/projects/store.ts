import { desc, eq } from 'drizzle-orm';
import { withDatabase } from '@/lib/db';
import { projects, sessions, deletedSessions } from '@/lib/db/schema';
import type { ProjectRecord } from './types';
function toProject(row: typeof projects.$inferSelect): ProjectRecord { return { ...row, sessionId: row.sessionId ?? undefined }; }
export async function readProjects(_userId: string): Promise<ProjectRecord[]> {
  return withDatabase(async db => (await db.select().from(projects).orderBy(desc(projects.updatedAt))).map(toProject));
}
export async function readProject(id: string): Promise<ProjectRecord | undefined> {
  return withDatabase(async db => { const [row] = await db.select().from(projects).where(eq(projects.id, id)); return row ? toProject(row) : undefined; });
}
export async function insertProject(project: ProjectRecord): Promise<void> { await withDatabase(async db => { await db.insert(projects).values(project); }); }
export async function updateProjectSession(id: string, sessionId: string | undefined): Promise<ProjectRecord> {
  return withDatabase(db => db.transaction(async tx => {
    const [project] = await tx.select().from(projects).where(eq(projects.id, id)).for('update');
    if (!project) throw new Error('Project not found.');
    if (sessionId) {
      const [session] = await tx.select().from(sessions).where(eq(sessions.id, sessionId));
      if (!session || session.projectId !== id) throw new Error('Session not found in this project.');
    }
    const [updated] = await tx.update(projects).set({ sessionId: sessionId ?? null, updatedAt: new Date().toISOString() }).where(eq(projects.id, id)).returning();
    return toProject(updated);
  }));
}
export async function renameProject(id: string, name: string): Promise<ProjectRecord> {
  return withDatabase(db => db.transaction(async tx => {
    const [row] = await tx.update(projects).set({ name, updatedAt: new Date().toISOString() }).where(eq(projects.id, id)).returning();
    if (!row) throw new Error('Project not found.');
    await tx.update(sessions).set({ projectName: name }).where(eq(sessions.projectId, id));
    return toProject(row);
  }));
}
export async function deleteProject(id: string): Promise<void> {
  await withDatabase(db => db.transaction(async tx => {
    const [project] = await tx.select().from(projects).where(eq(projects.id, id)).for('update');
    if (!project) return;
    const owned = await tx.select({ id: sessions.id }).from(sessions).where(eq(sessions.projectId, id));
    if (owned.length) await tx.insert(deletedSessions).values(owned.map(s => ({ id: s.id, deletedAt: new Date().toISOString() }))).onConflictDoNothing();
    await tx.delete(projects).where(eq(projects.id, id));
  }));
}
