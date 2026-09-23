# Sami Coding Agent

Sami is a browser-based coding agent built with Next.js, Vercel Eve, and shadcn/ui. User code runs in isolated Eve sandboxes rather than the Next.js application runtime.

This repository is intentionally optimized as a **single-owner deployment**: fork/deploy it for yourself, authenticate to enter, and continue the same projects, settings, and Eve conversations from any browser or device.

## Current capabilities

- Multiple AI providers with dynamic model discovery and searchable model selection
- Server-side encrypted provider credentials
- Cross-device provider settings and selected model
- Plan / Build modes with persisted session mode
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

Sami uses private Vercel Blob for application-owned persistent state and Eve for durable conversation history.

Persisted across devices:

- projects and active project session pointers
- Eve session IDs, titles, project association, Plan/Build mode, and timestamps
- last active workspace
- provider connections and encrypted API keys
- discovered provider models and selected model
- GitHub connection/PAT
- agent permission mode

Eve remains the source of truth for the actual conversation messages and tool events. Sami stores a durable session index so those Eve sessions can be discovered and resumed from another device.

Auth is still required in production, but storage is not partitioned by Better Auth user ID. Set `SAMI_OWNER_EMAIL` to your Vercel account email to ensure only that account can enter the shared owner workspace. Eve uses one stable logical principal (`sami-owner`) so repeated sign-ins on different devices resolve to the same workspace.

One deployed Sami instance is one workspace. There is no workspace ID setting: forks/deployments are isolated by their own Vercel project, domain, Blob store, and environment variables.

Static authored MCP connections and skills are part of the deployed repository, so they are already deployment-wide rather than device-local. Future user-created MCP and skill definitions should use the same single-owner persistence layer.

## Environment

Copy `.env.example` and configure the required values in Vercel.

```env
BETTER_AUTH_SECRET=...
VERCEL_APP_CLIENT_ID=...
VERCEL_APP_CLIENT_SECRET=...
SAMI_OWNER_EMAIL=you@example.com
BLOB_READ_WRITE_TOKEN=...
PROVIDER_SECRET_ENCRYPTION_KEY=...
```

`PROVIDER_SECRET_ENCRYPTION_KEY` must be at least 32 characters. It encrypts both AI provider credentials and GitHub personal access tokens at rest. Keep it stable across deployments or previously stored secrets cannot be decrypted.


### Existing-data migration

The first read of projects, providers, permissions, or GitHub settings automatically looks for the previous per-user Blob documents and migrates the newest applicable document into the new single-owner namespace. This avoids requiring provider/GitHub setup again after this update.

## GitHub connection

GitHub does not require a Vercel Connect GitHub connector.

Open **Settings → GitHub** and paste a GitHub personal access token. Sami validates it against GitHub, encrypts it server-side, and never returns the stored token to the browser.

For a fine-grained PAT, grant access only to the repositories Sami should work on. Add write permissions only when you need push or GitHub write operations. The same PAT authenticates the official remote GitHub MCP server at `https://api.githubcopilot.com/mcp/`.

Repository import uses GitHub REST for repository/branch discovery and real Git over HTTPS inside the Eve sandbox. MCP is an additional tool surface for repository metadata, issues, pull requests, workflows, and other GitHub operations; it is not required for cloning.

### Optional GitHub PAT environment fallback

For a single-owner deployment, you may set `GITHUB_PAT` in Vercel Environment Variables instead of entering a PAT in Settings → GitHub. Never put a real token in `.env.example` or commit it to Git.

## Cross-device chat workflow

1. Start or resume a chat on any device.
2. Sami persists the Eve session ID and metadata in private Blob.
3. Open `/sessions` on another authenticated device.
4. Select the chat to resume the same durable Eve session and message history.
5. Opening `/` automatically restores the last active saved workspace when one exists.

For project chats, the project keeps one active-session pointer while `/sessions` retains older project session entries so they can still be reopened explicitly.

## Development

Node 24.x is required.

```bash
npm install
npm run typecheck
npm run build:eve
npm run build
npm run dev
```

There is currently no lint or test script.
