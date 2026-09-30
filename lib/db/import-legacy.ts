import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { withDatabase } from './index';
import * as t from './schema';
import * as v from './legacy-schemas';
type Document<T> = { path: string; data: T };
export type LegacyDocuments = {
  projectDoc?: Document<z.output<typeof v.projectsSchema>>;
  sessionDoc?: Document<z.output<typeof v.sessionsSchema>>;
  providerDoc?: Document<z.output<typeof v.providersSchema>>;
  githubDoc?: Document<z.output<typeof v.githubSchema>>;
  permissionDoc?: Document<z.output<typeof v.permissionsSchema>>;
  configDoc?: Document<z.output<typeof v.configSchema>>;
  planDocs: Document<z.output<typeof v.planSchema>>[];
};
export async function importLegacy({ projectDoc, sessionDoc, providerDoc, githubDoc, permissionDoc, configDoc, planDocs }: LegacyDocuments) {
for (const project of projectDoc?.data.projects ?? []) {
  const linked = sessionDoc?.data.sessions.find(session => session.id === project.sessionId);
  if (linked && linked.projectId !== project.id) throw new Error('Legacy project/session relationship is inconsistent. Resolve the source documents before importing.');
}
const summary = { projects: 0, sessions: 0, providers: 0, models: 0, todos: 0, documents: 0, skipped: 0 };
await withDatabase(db => db.transaction(async tx => {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('sami:blob-import', 0))`);
  async function pending(path: string) {
    const [previous] = await tx.select().from(t.imports).where(eq(t.imports.path, path));
    if (previous) summary.skipped++;
    return !previous;
  }
  async function done(path: string) { await tx.insert(t.imports).values({ path, importedAt: new Date().toISOString() }); summary.documents++; }
  if (projectDoc && await pending(projectDoc.path)) {
    for (const project of projectDoc.data.projects) {
      const rows = await tx.insert(t.projects).values({ ...project, sessionId: null }).onConflictDoNothing().returning({ id: t.projects.id });
      summary.projects += rows.length;
    }
    // Legacy project pointers are backfilled into session metadata once, never at runtime.
    for (const project of projectDoc.data.projects) {
      if (!project.sessionId) continue;
      const [deleted] = await tx.select().from(t.deletedSessions).where(eq(t.deletedSessions.id, project.sessionId));
      if (deleted) continue;
      const legacy = sessionDoc?.data.sessions.find(session => session.id === project.sessionId);
      const rows = await tx.insert(t.sessions).values({ id: project.sessionId, eveSessionId: project.sessionId, projectId: project.id, projectName: project.name, title: legacy?.title ?? project.name, agentMode: legacy?.agentMode, archived: legacy?.archived ?? false, createdAt: legacy?.createdAt ?? project.createdAt, updatedAt: legacy?.updatedAt ?? project.updatedAt }).onConflictDoNothing().returning({ id: t.sessions.id });
      summary.sessions += rows.length;
      if (rows.length && !legacy?.archived) await tx.update(t.projects).set({ sessionId: project.sessionId }).where(eq(t.projects.id, project.id));
    }
    await done(projectDoc.path);
  }
  if (sessionDoc && await pending(sessionDoc.path)) {
    for (const session of sessionDoc.data.sessions) {
      const [deleted] = await tx.select().from(t.deletedSessions).where(eq(t.deletedSessions.id, session.id));
      if (deleted) continue;
      const rows = await tx.insert(t.sessions).values({ ...session, eveSessionId: session.id }).onConflictDoNothing().returning({ id: t.sessions.id });
      summary.sessions += rows.length;
    }
    const active = sessionDoc.data.workspace;
    if (active.lastSessionId) {
      const [session] = await tx.select().from(t.sessions).where(eq(t.sessions.id, active.lastSessionId));
      if (session && !session.archived) await tx.insert(t.workspace).values({ id: 'owner', lastSessionId: session.id, lastProjectId: session.projectId, updatedAt: active.updatedAt }).onConflictDoNothing();
    }
    await done(sessionDoc.path);
  }
  if (providerDoc && await pending(providerDoc.path)) {
    for (const connection of providerDoc.data.connections) {
      const { models = [], ...stored } = connection;
      const rows = await tx.insert(t.providers).values({ id: stored.id, connection: stored }).onConflictDoNothing().returning({ id: t.providers.id });
      summary.providers += rows.length;
      if (rows.length && models.length) {
        const inserted = await tx.insert(t.providerModels).values(models.map(model => ({ providerId: stored.id, modelId: model.id, model }))).onConflictDoNothing().returning({ id: t.providerModels.modelId });
        summary.models += inserted.length;
      }
    }
    await done(providerDoc.path);
  }
  if (githubDoc && await pending(githubDoc.path)) {
    await tx.insert(t.github).values({ id: 'owner', connection: githubDoc.data }).onConflictDoNothing(); await done(githubDoc.path);
  }
  if (permissionDoc && await pending(permissionDoc.path)) {
    await tx.insert(t.permissions).values({ id: 'owner', mode: permissionDoc.data.mode, updatedAt: permissionDoc.data.updatedAt }).onConflictDoNothing(); await done(permissionDoc.path);
  }
  // Initialize once; never overwrite settings changed after cutover.
  await tx.insert(t.agentSettings).values({ id: 'owner', contextCompression: configDoc?.data.contextCompression ?? 'medium', selection: providerDoc?.data.selection, updatedAt: configDoc?.data.updatedAt }).onConflictDoNothing();
  if (configDoc && await pending(configDoc.path)) await done(configDoc.path);
  for (const doc of planDocs) {
    if (!await pending(doc.path)) continue;
    const { scope, items, updatedAt } = doc.data;
    const rows = await tx.insert(t.plans).values({ scope, updatedAt, projectId: scope.startsWith('project:') ? scope.slice(8) : null }).onConflictDoNothing().returning({ scope: t.plans.scope });
    if (rows.length && items.length) { await tx.insert(t.todos).values(items.map(item => ({ ...item, scope }))); summary.todos += items.length; }
    await done(doc.path);
  }
}));
return summary;
}
