import { eq } from 'drizzle-orm';
import { withDatabase } from '@/lib/db';
import { permissions } from '@/lib/db/schema';
import type { AgentPermissionMode, AgentPermissionSettings } from './types';
export async function readAgentPermissionSettings(_userId: string): Promise<AgentPermissionSettings> {
  return withDatabase(async db => {
    const [row] = await db.select().from(permissions).where(eq(permissions.id, 'owner'));
    return { mode: row?.mode ?? 'ask-before', updatedAt: row?.updatedAt ?? undefined };
  });
}
export async function writeAgentPermissionMode(_userId: string, mode: AgentPermissionMode): Promise<AgentPermissionSettings> {
  const updatedAt = new Date().toISOString();
  await withDatabase(async db => { await db.insert(permissions).values({ id: 'owner', mode, updatedAt }).onConflictDoUpdate({ target: permissions.id, set: { mode, updatedAt } }); });
  return { mode, updatedAt };
}
