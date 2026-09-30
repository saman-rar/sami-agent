# Project State

## Current status

Sami is a working Eve + Next.js coding-agent application with provider/model management, server-enforced Plan/Build and approval modes, sandbox file/shell/Git tools, GitHub-backed projects, durable cross-device chat discovery, and Dark+/One Dark/Light themes.

The deployment now intentionally uses a **single-owner workspace model**. Better Auth still gates browser access, but application state is no longer partitioned by Better Auth's generated user ID. This fixes the previous behavior where signing in again from another device could produce a different logical workspace.

## Completed

- Provider adapter architecture and dynamic model discovery
- Searchable model selector and persisted model selection
- Encrypted provider credentials in private Blob
- Plan / Build mode propagation and server-side mutation enforcement
- No Access / Ask Before / Full Access permission modes
- Eve sandbox bash/read/write/search tools
- Structured Git status/diff/branch/log/fetch/switch/commit/pull/push tools
- `/projects` repository import dashboard
- GitHub PAT connection UI, REST repository/branch discovery, and private clone support
- Sandbox credential brokering for authenticated Git remote operations
- Official remote GitHub MCP connection using the same server-side PAT
- Dark+ default theme, One Dark, and Light
- Deployment-wide single-owner persistence namespace for projects, providers/model selection, GitHub settings, and permissions
- Stable Eve principal ID (`sami-owner`) across authenticated browsers/devices
- Optional `SAMI_OWNER_EMAIL` gate so a public single-owner deployment can restrict access to one Vercel account
- Durable `/sessions` chat index for standalone and project Eve sessions
- Project sessions can be reopened from chat history, including older sessions for the same project
- Session metadata persists title, project association, last-used time, and Plan/Build mode
- Root `/` restores the last active persisted workspace when available
- Existing per-user Blob settings/projects are migrated into the single-owner namespace on first read
- Theme remains intentionally device-local

## Architectural decisions

### Decision: single-owner deployment state instead of per-auth-user state

**Reason:** This repository is intended to be forked by each owner rather than operated as a multi-tenant SaaS. Better Auth without an application database can issue different internal user IDs on separate sign-ins/devices. Persisting by that ID fragmented projects and settings. Authentication now controls entry, while the app and Eve runtime use one stable owner identity and one shared persisted workspace.

### Decision: keep Vercel Blob instead of adding PostgreSQL in this slice

**Reason:** The application already has working private Blob infrastructure and encrypted settings. Cross-device persistence only required removing the per-user storage partition and indexing Eve sessions. Avoiding a new ORM/database dependency materially reduces deployment risk and preserves the provider/GitHub build that is already known to work. PostgreSQL remains an option if future concurrent writes or richer relational project/session data justify it.

### Decision: Eve owns chat messages; Sami owns session discovery metadata

**Reason:** Eve sessions are already durable and are the canonical conversation history. Duplicating every message into another database would add synchronization and secret/tool-output risks. Sami persists the Eve session ID plus title/project/mode/timestamps so another device can discover and resume that same durable Eve conversation.

### Decision: legacy Blob migration is automatic

**Reason:** Provider keys, GitHub settings, permissions, and project metadata from the previous per-user implementation should not disappear. On first read, the app tries the current user's legacy key and then the most recently written legacy Blob under that settings prefix, copying the recovered document into the single-owner namespace.

## Device-local state

Only appearance/theme is intentionally local to each browser/device through `localStorage`.

## Deployment-wide state

- projects and active project sessions
- chat/session index and last active workspace
- provider connections, model catalog cache, and selected model
- encrypted provider API keys
- GitHub PAT/settings
- agent permission mode
- agent context-compression configuration
- authored MCP connections and repository skills (they are code/deployment capabilities, not browser state)

## Remaining priorities

1. IDE workspace: file explorer, editor, changed-files/diff panel, and terminal UI.
2. Session rename UX and richer project-specific session sidebar.
3. MCP Settings UI with discovery/enable-disable controls and persisted custom MCP definitions.
4. Skills Settings UI and runtime-loaded custom/project skill persistence.
5. GitHub token replacement/rotation UX and finer per-tool MCP approval classification.
6. Project creation without GitHub and later publish-to-GitHub workflow.
7. Consider PostgreSQL/Prisma when concurrent multi-device writes or richer query requirements justify moving beyond Blob documents.

## Setup required

Production requires:

```env
BETTER_AUTH_SECRET=...
VERCEL_APP_CLIENT_ID=...
VERCEL_APP_CLIENT_SECRET=...
SAMI_OWNER_EMAIL=... # strongly recommended
BLOB_READ_WRITE_TOKEN=...
PROVIDER_SECRET_ENCRYPTION_KEY=...
```

Optional shared GitHub fallback:

```env
GITHUB_PAT=...
```

Keep `BLOB_READ_WRITE_TOKEN` and `PROVIDER_SECRET_ENCRYPTION_KEY` stable between deployments if you want the same persisted workspace and decryptable secrets.

Decision:
One deployment is one persistent Sami workspace. The runtime uses a fixed storage namespace compatible with the previous default path, so existing Blob data remains available. `SAMI_OWNER_EMAIL` is only an optional access restriction.

Reason:
Forked deployments already provide isolation at the Vercel project/domain/storage level, so configurable logical workspaces add complexity without value for this product model.

## Validation status

- No package dependency versions changed in this persistence slice.
- Cross-device persistence compiler fixes: React 19 `useRef` is initialized explicitly and optional attachment filenames are narrowed before deriving chat titles.
- Full dependency-backed checks could not run in the working container because `npm install` timed out and the container uses Node 22 while this project targets Node 24.
- Before deployment run: `npm run typecheck`, `npm run build:eve`, and `npm run build` using the existing known-good lockfile.


## Phase 1 Architecture Improvements
- Added normalized model capabilities.
- Added thinking capability metadata foundation.
- Existing provider persistence remains compatible.

## Agent configuration cleanup

Completed:

- Removed the obsolete instrumentation feature code and stale imports from the latest refactored snapshot.
- Added Settings → Agent Configuration with a deployment-wide context-compression preference persisted in private Blob.
- Added Full context, Medium compression, and Maximum compression modes.
- The current mode is sent with Eve request metadata and included in each turn's `samiAgent.contextCompression` client context so the agent can adapt retrieval and tool-output behavior.
- Updated context policy semantics so Medium preserves prior conversation turns while compressing verbose tool results; Maximum permits aggressive context reduction.
- No dependency versions were changed.

Validation:

- Source-level TypeScript parse/import validation is run before handoff.
- Full dependency-backed `npm run typecheck`, `npm run build:eve`, and `npm run build` still require dependencies to be installed; the current execution environment could not complete `npm ci` within the available network window.
## Agent mode expansion

Completed:

- Added persisted `ask` mode alongside `plan` and `build`.
- Plan mode now uses an internal project-scoped todo tool for concrete implementation planning without restoring the removed Todo/dashboard UI.
- Ask mode is enforced as read-only by the protected-action approval policy and is instructed to explore the repository deeply before answering.
- Build mode reads relevant existing todos, updates their status while implementing, and owns completion of the full user goal rather than stopping at checklist completion.
- Added `validate_project` for mandatory final type + lint checks. Build mode is instructed not to commit/push if either check fails or cannot be discovered.
- After successful validation, Build mode reviews status/diff, commits only goal-related changes with an accurate message, and pushes the current branch through the existing approval-protected Git tooling.
- Session create/patch APIs now accept `ask`.
- No analytics or monitoring UI was reintroduced.

