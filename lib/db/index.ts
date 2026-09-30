import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as schema from './schema';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
const databaseContext = new AsyncLocalStorage<Database>();
export function withDatabaseContext<T>(db: Database, operation: () => Promise<T>): Promise<T> { return databaseContext.run(db, operation); }
export class PersistenceError extends Error {
  constructor() { super('Unable to access PostgreSQL. Check DATABASE_URL and run database migrations.'); }
}

// A request-scoped pool supports interactive transactions without leaving live
// WebSocket connections behind when a Vercel invocation is frozen.
export async function withDatabase<T>(operation: (db: Database) => Promise<T>): Promise<T> {
  const scoped = databaseContext.getStore();
  if (scoped) return operation(scoped);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new PersistenceError();
  neonConfig.webSocketConstructor = WebSocket;
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10000 });
  try {
    return await operation(drizzle(pool, { schema }));
  } catch (error) {
    // Drizzle query errors can contain SQL parameters (including credentials).
    if (error instanceof Error && (error.name.includes('Drizzle') || 'code' in error || 'query' in error)) {
      throw new PersistenceError();
    }
    throw error;
  } finally {
    await pool.end();
  }
}
