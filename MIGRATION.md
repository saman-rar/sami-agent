# PostgreSQL cutover

## Storage responsibilities

| Domain | Persistence |
| --- | --- |
| Projects, source repository/branch, active session | PostgreSQL `projects` |
| Session IDs, title, mode, model selection snapshot, project association | PostgreSQL `sessions` |
| Last active workspace | PostgreSQL `workspace` |
| Provider connections and encrypted API keys | PostgreSQL `provider_connections` |
| Discovered/custom model metadata | PostgreSQL `provider_models` |
| Model selection, compression | PostgreSQL `agent_settings` |
| Approval mode | PostgreSQL `agent_permissions` |
| Internal plans/todos | PostgreSQL `agent_plans`, `agent_todos` |
| Encrypted GitHub PAT and connection metadata | PostgreSQL `github_connections` |
| Future project integration/deployment/MCP/skill metadata | PostgreSQL `integration_metadata` (no fabricated records) |
| Future LLM/tool/MCP/skill measurements | PostgreSQL metrics tables + `lib/db/metrics.ts` |
| Actual messages, runtime tool events, Eve sessions and attachment transport | Existing Eve runtime |
| Authored MCP/skills and Vercel Connect grants | Existing repository/Eve configuration |
| Files/artifacts and legacy data backup | Blob/object storage; no byte columns added to PostgreSQL |

The supplied snapshot had no custom MCP/skill configuration store, persisted Vercel deployment mapping, or active analytics store to migrate. Their existing runtime behavior is unchanged. This migration does not add an analytics UI or claim new instrumentation.

## Before cutover

1. Use Node 24 and npm. `package-lock.json` is canonical; the stale alternate pnpm lockfile was removed.
2. Create a Neon PostgreSQL database and obtain its connection string. Set `DATABASE_URL` in `.env.local` locally and in both the Next.js and Eve server environments. Never paste it into source files.
3. Retain the exact existing `PROVIDER_SECRET_ENCRYPTION_KEY`; changing it makes migrated credentials unreadable.
4. Keep existing Better Auth/Vercel sign-in configuration and optional `GITHUB_PAT` fallback. Vercel supplies trusted host variables for production builds.
5. Pause writes to the legacy deployment during migration. The import reads a stable legacy snapshot; there is no dual-write synchronization.
6. Back up the database if importing into a nonempty database. Existing rows are preserved, not replaced.

## Commands

```bash
npm ci
npm run db:migrate
# Existing deployments only; requires BLOB_READ_WRITE_TOKEN:
npm run migrate:blob-to-postgres
npm run typecheck
npm test
npm run build:eve
npm run build
npm run dev
```

Scripts automatically load `.env.local` if present. A fresh installation skips the Blob import. Migrations are explicit, versioned, and not run from request handlers or normal builds.

## Import behavior

- Validates document versions, required fields, timestamps and encrypted-secret shapes before writing.
- Prefers the fixed single-owner paths used by this snapshot.
- For older per-user stores, one unambiguous legacy file can be selected. If multiple exist, set `LEGACY_USER_ID` explicitly; the importer will not guess the owner.
- Reads all Blob list pages and all owner-scoped plans.
- Preserves project/session/provider/todo IDs and encrypted ciphertext. Eve message history is never copied.
- Backfills old active-project sessions into the session table once. Existing archived rows remain archived; newly chosen Delete actions permanently delete.
- Uses one database transaction and import ledger. Any failed write rolls back the batch; reruns skip committed documents. Existing rows are not overwritten.
- Prints counts only; no secret-bearing documents/SQL parameters are logged.
- Does not delete or modify Blob originals.

Do not reopen the old writable deployment after cutover. To roll back, stop writers first and reconcile any new PostgreSQL data before returning to the legacy deployment; Blob backups do not include writes made after cutover.

## Deletion and failure handling

Deletion is internal to Sami. Project deletion cascades sessions, plans/todos and linked internal metadata/metrics. Session deletion removes the metadata row and clears workspace/project pointers. An ID-only tombstone prevents stale browser saves from restoring the deleted session. GitHub repositories, Vercel projects, external databases and retained Eve conversations are not deleted.

This Eve snapshot does not expose a verified canonical conversation-deletion API in the application flow, so no API was invented. The `/s/:id` page refuses missing metadata. A running Eve turn is not forcibly terminated by deleting Sami metadata; do not interpret Delete as a cancellation control. Use the existing Stop action to stop a running turn.

Eve creates its runtime session before Sami registration. Registration is idempotent and commits metadata plus active pointers together. If PostgreSQL is temporarily unavailable, the current browser retains the Eve ID and offers Retry saving chat. A successful retry saves the same session instead of creating another one.

## Validation and remaining deployment checks

Automated tests use PGlite, a local PostgreSQL engine, through the same Drizzle stores. They cover migrations, CRUD/modes, pagination, credentials, settings independence, cascade behavior, stale session protection, import idempotency, rollback and thinking-level forwarding. They do not replace a live Neon WebSocket connectivity check or authenticated end-to-end Eve/GitHub/Vercel tests.

After setting real server environment variables and deploying, check:

- Import summary and project/session/provider counts against the old installation.
- Add/open project, add/switch chat, both sidebar and dashboard delete confirmations.
- Provider key decryption, custom providers/models and thinking selection.
- Ask/Plan/Build tools, permissions, sandbox clone/push, Vercel MCP and skills.
- Retry saving chat after a simulated transient database failure.

No lint script is configured in the supplied project. `npm run lint` is therefore not a passing validation gate; it is unavailable.
