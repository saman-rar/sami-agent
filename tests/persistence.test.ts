import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { withDatabaseContext } from '../lib/db';
import * as schema from '../lib/db/schema';
import { insertProject, readProject, renameProject, deleteProject } from '../lib/projects/store';
import { upsertSessionRecord, getSessionRecord, listSessions, deleteSessionRecord, readWorkspaceState, updateSessionRecord } from '../lib/sessions/store';
import { replaceAgentPlan, updateAgentTodo, readAgentPlan } from '../lib/agent-plan/store';
import { encryptProviderSecret, decryptProviderSecret, saveProviderConnection, readProviderSettings, saveModelSelection, deleteProviderConnection } from '../lib/providers/store';
import { writeAgentConfigurationSettings, readAgentConfigurationSettings } from '../lib/agent-config/store';
import { writeAgentPermissionMode, readAgentPermissionSettings } from '../lib/permissions/store';
import { writeGitHubSettings, readGitHubToken, deleteGitHubSettings } from '../lib/github/store';
import { importLegacy } from '../lib/db/import-legacy';
import { providersSchema } from '../lib/db/legacy-schemas';
import { recordLLMRequest, recordToolCall } from '../lib/db/metrics';
import type { ProjectRecord } from '../lib/projects/types';
const project: ProjectRecord = { id: 'p1', name: 'Project', source: { type: 'github', repositoryId: 1, owner: 'owner', name: 'repo', fullName: 'owner/repo', private: true, htmlUrl: 'https://github.com/owner/repo', defaultBranch: 'main', branch: 'main' }, createdAt: '2026-09-30T00:00:00Z', updatedAt: '2026-09-30T00:00:00Z' };
test('PostgreSQL migration and application store lifecycle', async t => {
  process.env.PROVIDER_SECRET_ENCRYPTION_KEY = 'test-only-key-for-local-persistence-tests';
  const client = new PGlite(); const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  await migrate(db, { migrationsFolder: './drizzle' });
  try { await withDatabaseContext(db, async () => {
    await t.test('project/session CRUD, modes, pagination and atomic active pointers', async () => {
      await insertProject(project);
      await upsertSessionRecord({ sessionId: 's1', projectId: 'p1', title: 'First', agentMode: 'ask' });
      await upsertSessionRecord({ sessionId: 's1', projectId: 'p1', title: 'Do not overwrite meaningful title' });
      await upsertSessionRecord({ sessionId: 's2', projectId: 'p1', agentMode: 'build' });
      assert.equal((await listSessions()).length, 2); assert.equal((await getSessionRecord('s1'))?.title, 'First');
      assert.equal((await readProject('p1'))?.sessionId, 's2'); assert.equal((await readWorkspaceState()).lastSessionId, 's2');
      await renameProject('p1', 'Renamed'); assert.equal((await getSessionRecord('s1'))?.projectName, 'Renamed');
      await updateSessionRecord('s1', { agentMode: 'plan' }); assert.equal((await getSessionRecord('s1'))?.agentMode, 'plan');
      assert.equal((await listSessions({ limit: 1 })).length, 1);
      await assert.rejects(upsertSessionRecord({ sessionId: 'invalid', projectId: 'missing' }), /not found/);
      assert.equal(await getSessionRecord('invalid'), undefined);
    });
    await t.test('session deletion clears pointers and rejects stale re-registration', async () => {
      await deleteSessionRecord('s2'); await deleteSessionRecord('s2');
      assert.equal(await getSessionRecord('s2'), undefined); assert.equal((await readProject('p1'))?.sessionId, undefined);
      assert.deepEqual(await readWorkspaceState(), {});
      await assert.rejects(upsertSessionRecord({ sessionId: 's2', projectId: 'p1' }), /permanently deleted/);
    });
    await t.test('provider/model rows, encrypted secrets and independent settings', async () => {
      const encrypted = encryptProviderSecret('test-provider-secret');
      assert.equal(decryptProviderSecret(encrypted), 'test-provider-secret'); assert.ok(!JSON.stringify(encrypted).includes('test-provider-secret'));
      await saveProviderConnection({ id: 'openai', kind: 'openai', name: 'OpenAI', apiKey: encrypted, connectedAt: project.createdAt, updatedAt: project.updatedAt, models: [{ id: 'test', name: 'Test', providerId: 'openai', providerName: 'OpenAI', contextWindow: 1000, capabilities: { supportsTools: true, supportsVision: false, supportsThinking: true, thinkingLevels: ['low', 'high'] } }] }, true);
      await saveModelSelection({ providerId: 'openai', modelId: 'test', thinkingLevel: 'high' }); await writeAgentConfigurationSettings('maximum');
      assert.equal((await readProviderSettings('owner')).selection?.thinkingLevel, 'high'); assert.equal((await readAgentConfigurationSettings()).contextCompression, 'maximum');
      assert.equal((await readProviderSettings('owner')).connections[0].models?.length, 1);
      await writeAgentPermissionMode('owner', 'no-access'); assert.equal((await readAgentPermissionSettings('owner')).mode, 'no-access');
      await writeGitHubSettings('owner', { token: 'test-pat', login: 'owner' }); assert.equal(await readGitHubToken('owner'), 'test-pat');
      await deleteGitHubSettings('owner'); assert.equal(await readGitHubToken('owner'), undefined);
      await deleteProviderConnection('openai'); assert.equal((await readProviderSettings('owner')).selection, undefined);
      assert.equal((await db.select().from(schema.providerModels)).length, 0); assert.equal((await getSessionRecord('s1'))?.id, 's1');
    });
    await t.test('todo updates and project deletion cascade internal metadata', async () => {
      const plan = await replaceAgentPlan('project:p1', ['Inspect', 'Build']);
      await updateAgentTodo('project:p1', plan.items[0].id, { status: 'completed' }); await updateAgentTodo('project:p1', plan.items[1].id, { title: 'Validate' });
      const updated = await readAgentPlan('project:p1'); assert.equal(updated.items[0].status, 'completed'); assert.equal(updated.items[1].title, 'Validate');
      await recordLLMRequest({ id: 'r1', sessionId: 's1', projectId: 'p1', provider: 'openai', model: 'test', createdAt: project.createdAt });
      await recordToolCall({ id: 't1', sessionId: 's1', requestId: 'r1', toolName: 'read_file', status: 'success', createdAt: project.createdAt });
      await deleteProject('p1'); await deleteProject('p1'); assert.equal(await readProject('p1'), undefined); assert.equal((await listSessions()).length, 0);
      assert.equal((await readAgentPlan('project:p1')).items.length, 0); assert.equal((await db.select().from(schema.toolCalls)).length, 0);
      assert.equal((await db.select().from(schema.llmRequests)).length, 0);
      assert.equal((await db.select().from(schema.deletedSessions).where(eq(schema.deletedSessions.id, 's1'))).length, 1);
    });
    await t.test('legacy import is idempotent, preserves IDs and does not overwrite newer data', async () => {
      const projectDoc = { path: 'legacy/projects', data: { version: 1 as const, projects: [{ ...project, id: 'imported', sessionId: 'legacy-session' }] } };
      const planDocs = [{ path: 'legacy/plan', data: { version: 1 as const, scope: 'project:imported', updatedAt: project.updatedAt, items: [{ id: 'legacy-todo', title: 'Legacy task', status: 'completed' as const, order: 0 }] } }];
      const first = await importLegacy({ projectDoc, planDocs }); assert.equal(first.projects, 1); assert.equal(first.sessions, 1); assert.equal(first.todos, 1);
      await renameProject('imported', 'New name'); const second = await importLegacy({ projectDoc, planDocs });
      assert.equal(second.projects, 0); assert.equal(second.skipped, 2); assert.equal((await readProject('imported'))?.name, 'New name');
      await deleteProject('imported'); await importLegacy({ projectDoc, planDocs }); assert.equal(await readProject('imported'), undefined);
    });
    await t.test('failed import rolls back; plaintext credentials fail validation', async () => {
      await assert.rejects(importLegacy({ projectDoc: { path: 'rollback/project', data: { version: 1, projects: [{ ...project, id: 'rollback' }] } }, planDocs: [{ path: 'rollback/plan', data: { version: 1, scope: 'project:missing', items: [], updatedAt: project.updatedAt } }] }));
      assert.equal(await readProject('rollback'), undefined);
      assert.equal((await db.select().from(schema.imports).where(eq(schema.imports.path, 'rollback/project'))).length, 0);
      assert.equal(providersSchema.safeParse({ version: 1, connections: [{ id: 'bad', apiKey: 'plaintext' }] }).success, false);
    });
  }); } finally { await client.close(); }
});
