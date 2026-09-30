# Project State

## PostgreSQL migration

Source: only `sami-agent-agent-modes-ask-plan-build(3).zip`; no older project snapshot was merged.

Implemented:

- Neon PostgreSQL driver + Drizzle schema, relations, indexes, foreign keys and two committed SQL migrations.
- PostgreSQL stores for projects, session discovery/selection metadata, workspace, provider connections/models/selection, encrypted GitHub credentials, approval settings, compression settings, and internal plans/todos.
- Individual row operations and transactional registration/deletion. Provider writes reject stale versions; model selection and compression update independently.
- Explicit Blob import with runtime validation, ID/ciphertext preservation, import ledger, atomic rollback and rerun protection. It does not delete old Blob objects.
- Sidebar project links use project IDs; project-specific Add Session is wired.
- Project deletion in sidebar and dashboard; session deletion in sidebar and session dashboard, with shared destructive confirmation/error handling.
- Removed archive mutation from the session API; old archived data is retained during migration.
- Active pointers use referential integrity. Minimal deleted-session tombstones prevent late registration callbacks from recreating deleted metadata.
- Chat registration saves session/project/workspace atomically and offers a retry with the existing Eve ID on failure. Sidebar refreshes after mutations and on browser focus; older chats can be loaded in the dashboard.
- Server pages reject missing session metadata and redirect project sessions to their project workspace.
- Reasoning selection is validated against model metadata and forwarded into both AI SDK model-call boundaries.
- PostgreSQL metrics tables and typed insert helpers prepared. No analytics/Todo dashboard or fake runtime metrics were added.

## Existing boundaries retained

Eve remains canonical for messages, conversation execution, tool events and attachment transport. Sandbox execution, Git credential brokering, Ask/Plan/Build policies and approval enforcement remain in the supplied runtime architecture. This snapshot's MCP connections, skills and Vercel Connect credentials are authored/Eve-managed capabilities; no corresponding Blob store existed. Future integration metadata has a PostgreSQL schema, but no new MCP/skills/deployment UI or runtime is claimed.

Application runtime no longer reads or writes structured Blob documents. `@vercel/blob` remains installed and is used directly by the explicit legacy importer only. Existing browser Blob URLs are attachment/export objects, not database persistence. No binary files were moved into PostgreSQL.

## Environment and rollout

New: DATABASE_URL (Neon PostgreSQL), configured for both Next.js and Eve.
Unchanged: PROVIDER_SECRET_ENCRYPTION_KEY, Better Auth/Vercel credentials, optional SAMI_OWNER_EMAIL and GITHUB_PAT.
Import: BLOB_READ_WRITE_TOKEN; LEGACY_USER_ID only if older per-user documents are ambiguous.

Read MIGRATION.md for exact cutover, import, rollback and verification steps. Run migrations/import before admitting writes to the new deployment. Do not change the encryption key. npm/package-lock.json is canonical; the stale pnpm lockfile was removed.

## Validation

- Dependency-backed TypeScript: passed.
- Automated tests: 8 passed, 0 failed, using PGlite PostgreSQL and the actual Drizzle application stores.
- Tests include both migration application/rerun, project/session operations, mode/selection metadata, encrypted credential roundtrip, independent settings, todo updates, cascade deletion, stale-session protection, import idempotency and atomic rollback, and thinking-option forwarding.
- Next.js production build: passed with explicit build-only placeholder auth configuration; no actual credentials were used.
- Eve build: passed with the same build-only auth settings. Existing warnings: unsupported agent/context directory and optional @opentelemetry/api resolution in Better Auth.
- Lint: unavailable; no lint script/configuration in the supplied snapshot. Not claimed as passed.
- npm clean-install lockfile check: passed (`npm ci --dry-run --ignore-scripts`).
- Live Neon connection, real Blob import, authenticated browser end-to-end Eve/provider/GitHub/Vercel calls: not run; no DATABASE_URL or service credentials were provided.

## Known limitations

- Deletion removes Sami data only. Eve-retained conversations and any already-running turn are not erased/cancelled; existing Stop handles cancellation. No unsupported Eve deletion API was invented.
- Blob import expects a quiescent source. It deliberately does not dual-write or overwrite rows that have changed after cutover.
- Provider/model selection remains deployment-wide as in the supplied snapshot; session rows retain a metadata snapshot.
- Archived legacy chats are preserved in PostgreSQL and excluded from normal discovery as before; new Delete actions never archive.
- One deployment remains one owner workspace, not a new multi-tenant application.
