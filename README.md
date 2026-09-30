# Sami Coding Agent

Sami is a browser-based coding agent built with Next.js, Vercel Eve, and shadcn/ui. User code runs in isolated Eve sandboxes rather than the Next.js application runtime.

This repository is intentionally optimized as a **single-owner deployment**: fork/deploy it for yourself, authenticate to enter, and continue the same projects, settings, and Eve conversations from any browser or device.

## Current capabilities

- Multiple AI providers with dynamic model discovery and searchable model selection
- Server-side encrypted provider credentials
- Cross-device provider settings and selected model
- Plan / Ask / Build modes with persisted session mode
- No Access / Ask Before / Full Access approval modes
- Eve sandbox file, shell, and Git tools
- GitHub repository import with branch selection
- Private repository clone/pull/push through sandbox credential brokering
- Official remote GitHub MCP connection using the same server-side PAT
- Deployment-wide project and chat/session history
- Resume standalone or project conversations from `/sessions`
- Restore the last active workspace when opening `/`
- Dark+, One Dark, and Light themes; theme is intentionally local to each device

## Persistence model

Sami uses Neon PostgreSQL with Drizzle ORM for structured application state. Eve remains canonical for durable conversation history. Vercel Blob is reserved for file/artifact bytes and the explicit legacy import.

Persisted across devices:

- projects and active project session pointers
- Eve session IDs, titles, project association, Plan/Ask/Build mode, and timestamps
- last active workspace
- provider connections and encrypted API keys
- discovered provider models and selected model
- GitHub connection/PAT
- agent permission mode

Eve remains the source of truth for the actual conversation messages and tool events. Sami stores a durable session index so those Eve sessions can be discovered and resumed from another device.

Auth is still required in production, but storage is not partitioned by Better Auth user ID. Set `SAMI_OWNER_EMAIL` to your Vercel account email to ensure only that account can enter the shared owner workspace. Eve uses one stable logical principal (`sami-owner`) so repeated sign-ins on different devices resolve to the same workspace.

One deployed Sami instance is one workspace. There is no workspace ID setting: forks/deployments are isolated by their own Vercel project, domain, PostgreSQL database, and environment variables.

Static authored MCP connections and skills are part of the deployed repository, so they are already deployment-wide rather than device-local. Future user-created MCP and skill definitions should use the same single-owner persistence layer.

## Environment

Copy `.env.example` and configure the required values in Vercel.

```env
BETTER_AUTH_SECRET=...
VERCEL_APP_CLIENT_ID=...
VERCEL_APP_CLIENT_SECRET=...
SAMI_OWNER_EMAIL=you@example.com
DATABASE_URL=...
BLOB_READ_WRITE_TOKEN=... # legacy import / files
PROVIDER_SECRET_ENCRYPTION_KEY=...
```

`PROVIDER_SECRET_ENCRYPTION_KEY` must be at least 32 characters. It encrypts both AI provider credentials and GitHub personal access tokens at rest. Keep it stable across deployments or previously stored secrets cannot be decrypted.


### Existing-data migration

Read [MIGRATION.md](MIGRATION.md) before deploying over an existing installation. Stop writes to the old deployment, keep the existing encryption key, then run:

```bash
npm ci
npm run db:migrate
npm run migrate:blob-to-postgres
```

The importer keeps original Blob data, preserves IDs and ciphertext, and does not overwrite newer PostgreSQL rows on reruns. There is no automatic fallback or dual-write mode. A fresh installation needs only `db:migrate` before starting the application.

## GitHub connection

GitHub does not require a Vercel Connect GitHub connector.

Open **Settings → GitHub** and paste a GitHub personal access token. Sami validates it against GitHub, encrypts it server-side, and never returns the stored token to the browser.

For a fine-grained PAT, grant access only to the repositories Sami should work on. Add write permissions only when you need push or GitHub write operations. The same PAT authenticates the official remote GitHub MCP server at `https://api.githubcopilot.com/mcp/`.

Repository import uses GitHub REST for repository/branch discovery and real Git over HTTPS inside the Eve sandbox. MCP is an additional tool surface for repository metadata, issues, pull requests, workflows, and other GitHub operations; it is not required for cloning.

### Optional GitHub PAT environment fallback

For a single-owner deployment, you may set `GITHUB_PAT` in Vercel Environment Variables instead of entering a PAT in Settings → GitHub. Never put a real token in `.env.example` or commit it to Git.

## Cross-device chat workflow

1. Start or resume a chat on any device.
2. Sami persists the Eve session ID and metadata in PostgreSQL.
3. Open `/sessions` on another authenticated device.
4. Select the chat to resume the same durable Eve session and message history.
5. Opening `/` automatically restores the last active saved workspace when one exists.

For project chats, the project keeps one active-session pointer while `/sessions` retains older project session entries so they can still be reopened explicitly.

## Development

Node 24.x is required.

```bash
npm ci
npm run db:migrate
npm run typecheck
npm test
npm run build:eve
npm run build
npm run dev
```

`npm test` runs persistence tests against a local PostgreSQL engine (PGlite), including both migrations, row operations, cascade deletion, encrypted credentials, import idempotency and rollback. No lint script exists in this snapshot.

Production builds require the existing authentication environment variables and a trusted deployment host (`VERCEL_URL` is provided automatically on Vercel). Both the Next.js application and separately deployed Eve runtime need DATABASE_URL and the unchanged encryption key.

## Project and session actions

Project import, switching, rename API, and session creation use PostgreSQL stores. The sidebar now links to project IDs and includes a project-specific Add Session action. Sidebar and dashboards expose confirmed permanent deletion; session removal no longer archives. Active pointers are cleared on deletion, and stale tabs cannot recreate deleted session metadata. Session history has a Load more action for older results.

When Eve creates a session but metadata persistence fails, the current chat shows the error and a Retry saving chat action using the same Eve ID. No unsupported Eve deletion API is called. Deleting a Sami project/session does not erase Eve-retained conversation data or delete a GitHub repository, Vercel project, or external database.

Authored MCP connections, skills, and Vercel Connect authentication remain in the existing Eve architecture. Metrics tables and typed insert helpers are prepared for future instrumentation; the removed analytics/Todo dashboard is not restored.
