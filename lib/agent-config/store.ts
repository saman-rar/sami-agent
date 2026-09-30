import { eq } from 'drizzle-orm';
import { withDatabase } from '@/lib/db';
import { agentSettings } from '@/lib/db/schema';
import { DEFAULT_CONTEXT_COMPRESSION, type AgentConfigurationSettings, type ContextCompressionMode } from './types';
export async function readAgentConfigurationSettings(): Promise<AgentConfigurationSettings> {
  return withDatabase(async db => {
    const [row] = await db.select().from(agentSettings).where(eq(agentSettings.id, 'owner'));
    return { contextCompression: row?.contextCompression ?? DEFAULT_CONTEXT_COMPRESSION, updatedAt: row?.updatedAt ?? undefined };
  });
}
export async function writeAgentConfigurationSettings(contextCompression: ContextCompressionMode): Promise<AgentConfigurationSettings> {
  const updatedAt = new Date().toISOString();
  await withDatabase(async db => { await db.insert(agentSettings).values({ id: 'owner', contextCompression, updatedAt }).onConflictDoUpdate({ target: agentSettings.id, set: { contextCompression, updatedAt } }); });
  return { contextCompression, updatedAt };
}
