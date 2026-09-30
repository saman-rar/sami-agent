import { randomUUID } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { withDatabase } from '@/lib/db';
import { plans, todos, projects } from '@/lib/db/schema';
const DOCUMENT_VERSION = 1 as const;
export type AgentTodoStatus = "pending" | "in_progress" | "completed";

export type AgentTodoItem = {
  id: string;
  title: string;
  status: AgentTodoStatus;
  order: number;
};

export type AgentPlanDocument = {
  version: typeof DOCUMENT_VERSION;
  scope: string;
  items: AgentTodoItem[];
  updatedAt: string;
};


export async function readAgentPlan(scope: string): Promise<AgentPlanDocument> {
  return withDatabase(db => db.transaction(async tx => {
    const [plan] = await tx.select().from(plans).where(eq(plans.scope, scope));
    const items = await tx.select({ id: todos.id, title: todos.title, status: todos.status, order: todos.order }).from(todos).where(eq(todos.scope, scope)).orderBy(asc(todos.order));
    return { version: 1, scope, items, updatedAt: plan?.updatedAt ?? new Date(0).toISOString() };
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' }));
}
export async function replaceAgentPlan(scope: string, titles: string[]): Promise<AgentPlanDocument> {
  return withDatabase(db => db.transaction(async tx => {
    const projectId = scope.startsWith('project:') ? scope.slice(8) : null;
    if (projectId) {
      const [project] = await tx.select().from(projects).where(eq(projects.id, projectId)).for('update');
      if (!project) throw new Error('Project not found.');
    }
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'plan:' + scope}, 0))`);
    const updatedAt = new Date().toISOString();
    await tx.insert(plans).values({ scope, projectId, updatedAt }).onConflictDoUpdate({ target: plans.scope, set: { updatedAt } });
    await tx.delete(todos).where(eq(todos.scope, scope));
    const items: AgentTodoItem[] = titles.map((title, order) => ({ id: randomUUID(), title, status: 'pending', order }));
    if (items.length) await tx.insert(todos).values(items.map(item => ({ ...item, scope })));
    return { version: 1, scope, items, updatedAt };
  }));
}
export async function updateAgentTodo(scope: string, id: string, patch: { title?: string; status?: AgentTodoStatus }): Promise<AgentPlanDocument> {
  return withDatabase(db => db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'plan:' + scope}, 0))`);
    const updatedAt = new Date().toISOString();
    // Parent-first locking also makes concurrent project deletion safe.
    const parents = await tx.update(plans).set({ updatedAt }).where(eq(plans.scope, scope)).returning();
    if (!parents.length) throw new Error('Todo plan not found.');
    const rows = await tx.update(todos).set(patch).where(and(eq(todos.id, id), eq(todos.scope, scope))).returning();
    if (!rows.length) throw new Error('Todo item not found.');
    const items = await tx.select({ id: todos.id, title: todos.title, status: todos.status, order: todos.order }).from(todos).where(eq(todos.scope, scope)).orderBy(asc(todos.order));
    return { version: 1, scope, items, updatedAt };
  }));
}
export async function clearAgentPlan(scope: string): Promise<AgentPlanDocument> { return replaceAgentPlan(scope, []); }
