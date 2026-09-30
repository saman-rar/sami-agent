import { withDatabase } from './index';
import { llmRequests, toolCalls, mcpCalls, skillUsage } from './schema';
// Callers supply actual measured values; no synthetic events or dashboard.
export async function recordLLMRequest(metric: typeof llmRequests.$inferInsert): Promise<void> { await withDatabase(async db => { await db.insert(llmRequests).values(metric).onConflictDoNothing(); }); }
export async function recordToolCall(metric: typeof toolCalls.$inferInsert): Promise<void> { await withDatabase(async db => { await db.insert(toolCalls).values(metric).onConflictDoNothing(); }); }
export async function recordMCPCall(metric: typeof mcpCalls.$inferInsert): Promise<void> { await withDatabase(async db => { await db.insert(mcpCalls).values(metric).onConflictDoNothing(); }); }
export async function recordSkillUsage(metric: typeof skillUsage.$inferInsert): Promise<void> { await withDatabase(async db => { await db.insert(skillUsage).values(metric).onConflictDoNothing(); }); }
