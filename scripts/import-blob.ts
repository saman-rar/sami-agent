import { get, list } from '@vercel/blob';
import { importLegacy } from '../lib/db/import-legacy';
import * as v from '../lib/db/legacy-schemas';
import { ownerStoragePath, legacyUserHash } from '../lib/persistence/single-owner';
import { z } from 'zod';

if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is required for legacy import.');
const paths: string[] = [];
let cursor: string | undefined;
do {
  const page = await list({ cursor, limit: 1000 });
  paths.push(...page.blobs.map(blob => blob.pathname));
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);
function choose(area: string): string | undefined {
  const owner = ownerStoragePath(area, 1);
  if (paths.includes(owner)) return owner;
  const prefix = `${area}/v1/`;
  const candidates = paths.filter(path => path.startsWith(prefix) && path.endsWith('.json')).sort();
  if (process.env.LEGACY_USER_ID) {
    const path = `${prefix}${legacyUserHash(process.env.LEGACY_USER_ID)}.json`;
    return candidates.includes(path) ? path : undefined;
  }
  if (candidates.length > 1) throw new Error(`Multiple legacy ${area} documents found. Set LEGACY_USER_ID explicitly; no arbitrary user's data will be selected.`);
  return candidates[0];
}
async function load<S extends z.ZodType>(area: string, schema: S): Promise<{ path: string; data: z.output<S> } | undefined> {
  const path = choose(area);
  return path ? loadPath(path, schema) : undefined;
}
async function loadPath<S extends z.ZodType>(path: string, schema: S): Promise<{ path: string; data: z.output<S> }> {
  const blob = await get(path, { access: 'private', useCache: false });
  if (!blob?.stream) throw new Error(`Unable to read legacy document: ${path}`);
  const result = schema.safeParse(await new Response(blob.stream).json());
  if (!result.success) throw new Error(`Invalid legacy document: ${path}. Fields: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
  return { path, data: result.data };
}
const [projectDoc, sessionDoc, providerDoc, githubDoc, permissionDoc, configDoc] = await Promise.all([
  load('projects', v.projectsSchema), load('sessions', v.sessionsSchema), load('settings/providers', v.providersSchema),
  load('settings/github', v.githubSchema), load('settings/permissions', v.permissionsSchema), load('settings/agent-configuration', v.configSchema),
]);
const ownerPrefix = ownerStoragePath('agent-plan', 1).replace('/v1.json', '/');
const planDocs = await Promise.all(paths.filter(path => path.startsWith(ownerPrefix) && path.endsWith('/v1.json')).sort().map(path => loadPath(path, v.planSchema)));
const summary = await importLegacy({ projectDoc, sessionDoc, providerDoc, githubDoc, permissionDoc, configDoc, planDocs });
console.log('Legacy import committed. Blob originals were not changed.');
console.log(JSON.stringify(summary, null, 2));
