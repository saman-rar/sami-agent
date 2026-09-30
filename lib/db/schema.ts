import { relations, sql } from 'drizzle-orm';
import { pgTable, text, jsonb, integer, boolean, index, primaryKey, check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { GitHubProjectSource } from '../projects/types';
import type { AgentMode } from '../agent-mode';
import type { ModelSelection, ProviderModel } from '../providers/types';
import type { StoredProviderConnection } from '../providers/store';
import type { GitHubSettingsDocument } from '../github/store';
import type { AgentPermissionMode } from '../permissions/types';
import type { ContextCompressionMode } from '../agent-config/types';
import type { AgentTodoStatus } from '../agent-plan/store';

export const projects = pgTable('projects', {
  id: text().primaryKey(), name: text().notNull(), source: jsonb().$type<GitHubProjectSource>().notNull(),
  sessionId: text().references((): AnyPgColumn => sessions.id, { onDelete: 'set null' }), createdAt: text().notNull(), updatedAt: text().notNull(),
}, t => [index('projects_updated_idx').on(t.updatedAt)]);
export const sessions = pgTable('sessions', {
  id: text().primaryKey(), eveSessionId: text().notNull().unique(),
  projectId: text().references(() => projects.id, { onDelete: 'cascade' }),
  title: text().notNull(), projectName: text(), agentMode: text().$type<AgentMode>(),
  selection: jsonb().$type<ModelSelection>(), archived: boolean().notNull().default(false),
  createdAt: text().notNull(), updatedAt: text().notNull(),
}, t => [index('sessions_project_updated_idx').on(t.projectId, t.updatedAt), index('sessions_updated_idx').on(t.updatedAt), check('sessions_mode_check', sql`${t.agentMode} in ('ask', 'plan', 'build')`)]);
// Tombstones prevent stale tabs/late Eve callbacks from re-registering deleted sessions.
export const deletedSessions = pgTable('deleted_sessions', { id: text().primaryKey(), deletedAt: text().notNull() });
export const workspace = pgTable('workspace', {
  id: text().primaryKey(), lastSessionId: text().references(() => sessions.id, { onDelete: 'set null' }),
  lastProjectId: text().references(() => projects.id, { onDelete: 'set null' }), updatedAt: text(),
});
export const providers = pgTable('provider_connections', {
  id: text().primaryKey(), connection: jsonb().$type<Omit<StoredProviderConnection, 'models'>>().notNull(),
});
export const providerModels = pgTable('provider_models', {
  providerId: text().notNull().references(() => providers.id, { onDelete: 'cascade' }),
  modelId: text().notNull(), model: jsonb().$type<ProviderModel>().notNull(),
}, t => [primaryKey({ columns: [t.providerId, t.modelId] })]);
export const agentSettings = pgTable('agent_settings', {
  id: text().primaryKey(), contextCompression: text().$type<ContextCompressionMode>().notNull().default('medium'),
  selection: jsonb().$type<ModelSelection>(), updatedAt: text(),
});
export const permissions = pgTable('agent_permissions', {
  id: text().primaryKey(), mode: text().$type<AgentPermissionMode>().notNull(), updatedAt: text(),
});
export const github = pgTable('github_connections', {
  id: text().primaryKey(), connection: jsonb().$type<GitHubSettingsDocument>().notNull(),
});
export const plans = pgTable('agent_plans', {
  scope: text().primaryKey(), projectId: text().references(() => projects.id, { onDelete: 'cascade' }), updatedAt: text().notNull(),
});
export const todos = pgTable('agent_todos', {
  id: text().primaryKey(), scope: text().notNull().references(() => plans.scope, { onDelete: 'cascade' }),
  title: text().notNull(), status: text().$type<AgentTodoStatus>().notNull(), order: integer().notNull(),
}, t => [index('todos_scope_order_idx').on(t.scope, t.order), check('todos_status_check', sql`${t.status} in ('pending', 'in_progress', 'completed')`)]);
export const integrationMetadata = pgTable('integration_metadata', {
  id: text().primaryKey(), kind: text().notNull(), projectId: text().references(() => projects.id, { onDelete: 'cascade' }),
  metadata: jsonb().$type<Record<string, unknown>>().notNull(),
  encryptedSecret: jsonb().$type<StoredProviderConnection['apiKey']>(),
}, t => [index('integration_project_kind_idx').on(t.projectId, t.kind)]);
export const llmRequests = pgTable('llm_requests', {
  id: text().primaryKey(), sessionId: text().references(() => sessions.id, { onDelete: 'cascade' }),
  projectId: text().references(() => projects.id, { onDelete: 'cascade' }), provider: text().notNull(), model: text().notNull(),
  inputTokens: integer(), outputTokens: integer(), reasoningTokens: integer(), cachedTokens: integer(),
  durationMs: integer(), createdAt: text().notNull(),
}, t => [index('llm_session_created_idx').on(t.sessionId, t.createdAt), index('llm_project_idx').on(t.projectId)]);
export const toolCalls = pgTable('tool_calls', {
  id: text().primaryKey(), sessionId: text().references(() => sessions.id, { onDelete: 'cascade' }),
  requestId: text().references(() => llmRequests.id, { onDelete: 'set null' }), toolName: text().notNull(),
  durationMs: integer(), status: text().notNull(), createdAt: text().notNull(),
}, t => [index('tools_session_created_idx').on(t.sessionId, t.createdAt)]);
export const mcpCalls = pgTable('mcp_calls', {
  id: text().primaryKey(), sessionId: text().references(() => sessions.id, { onDelete: 'cascade' }),
  connectionId: text().references(() => integrationMetadata.id, { onDelete: 'set null' }),
  toolName: text().notNull(), durationMs: integer(), status: text().notNull(), createdAt: text().notNull(),
}, t => [index('mcp_session_created_idx').on(t.sessionId, t.createdAt)]);
export const skillUsage = pgTable('skill_usage', {
  id: text().primaryKey(), sessionId: text().references(() => sessions.id, { onDelete: 'cascade' }),
  skillId: text().notNull(), createdAt: text().notNull(),
}, t => [index('skills_session_created_idx').on(t.sessionId, t.createdAt)]);
export const imports = pgTable('legacy_imports', { path: text().primaryKey(), importedAt: text().notNull() });
export const projectRelations = relations(projects, ({ many }) => ({ sessions: many(sessions), plans: many(plans) }));
export const sessionRelations = relations(sessions, ({ one }) => ({ project: one(projects, { fields: [sessions.projectId], references: [projects.id] }) }));
export const providerRelations = relations(providers, ({ many }) => ({ models: many(providerModels) }));
export const modelRelations = relations(providerModels, ({ one }) => ({ provider: one(providers, { fields: [providerModels.providerId], references: [providers.id] }) }));
export const planRelations = relations(plans, ({ one, many }) => ({ project: one(projects, { fields: [plans.projectId], references: [projects.id] }), items: many(todos) }));
export const todoRelations = relations(todos, ({ one }) => ({ plan: one(plans, { fields: [todos.scope], references: [plans.scope] }) }));
