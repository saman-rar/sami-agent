# Sami Coding Agent — Project Guide

## Purpose

Sami is a browser-based, cloud-hosted AI coding workspace built with Next.js and Vercel Eve. The target product combines an IDE-like project workspace with durable agent sessions, isolated execution, provider/model choice, Git/GitHub workflows, MCP, reusable skills, and server-enforced approvals.

This repository is the **coding-agent application**. User projects must run in Eve sandboxes; never execute untrusted user project code directly in the Next.js application runtime.

## Read framework skills before authoring

The repository ships project skills under `agent/skills/`. Before changing Eve or shadcn behavior, read:

- `agent/skills/eve/SKILL.md`
- `agent/skills/shadcn/SKILL.md`

For Eve authoring, inspect the installed `eve` docs first (`node_modules/eve/docs`) when available. If package docs are unavailable, use the current official Eve docs. Prefer Eve primitives and registry integrations to parallel custom implementations.

## Technology stack

- Next.js 16 / React 19 / TypeScript
- Vercel Eve for agent runtime, durable sessions, tools, sandboxing, approvals, skills, and MCP connections
- Better Auth with Vercel sign-in for the browser application
- shadcn/ui-style local components under `components/ui/`
- AI SDK provider packages for direct/custom provider adapters
- Vercel Private Blob for single-owner cross-device persistence of projects, session metadata, provider/model settings, GitHub credentials, and permissions

Node 24.x is required by `package.json`.

## Important directories

- `agent/` — Eve-authored runtime: agent config, instructions, channels, tools, connections, skills
- `app/` — Next.js routes and browser UI
- `app/api/` — authenticated application APIs; secrets must stay server-side
- `components/` — reusable UI, including coding-agent controls
- `lib/providers/` — provider registry/adapters, model discovery, encrypted credential persistence, runtime model resolution
- `lib/github/` — encrypted single-owner GitHub PAT storage, GitHub REST client, and sandbox credential-broker policy
- `lib/projects/` — deployment-wide GitHub project metadata and active-session persistence
- `lib/permissions/` — global agent permission persistence
- `lib/server/` — authenticated request/API boundary helpers
- `PROJECT_STATE.md` — current implementation state, blockers, next priorities, and validation status

## Provider architecture

Provider integrations use a shared adapter interface (`lib/providers/types.ts`) rather than vendor conditionals across the application. Built-ins currently cover OpenRouter, OpenCode Zen, Kilo Gateway, Vercel AI Gateway, OpenAI, Anthropic, Google Gemini, and custom OpenAI-compatible endpoints.

Rules:

- Discover models dynamically from provider catalog APIs when available; do not maintain a fake static catalog.
- Normalize provider models to the common `ProviderModel` shape.
- Provider API keys are entered in browser forms but are never returned after storage.
- Provider keys and GitHub PATs are AES-256-GCM encrypted server-side with `PROVIDER_SECRET_ENCRYPTION_KEY` before persistence. Persisted settings are deployment-wide/single-owner rather than keyed by Better Auth user ID.
- Production persistence uses private Vercel Blob. Development without Blob uses process-memory only.
- Never put provider keys in localStorage, sessionStorage, repository files, client persisted state, logs, or model context.
- Custom provider endpoints must pass the SSRF checks in `lib/providers/safe-fetch.ts`; keep redirects disabled.
- The chat stores only provider/model identifiers. `agent/agent.ts` resolves the selected model server-side for each Eve model step.

## GitHub project architecture

GitHub projects are an application-owned layer on top of Eve sessions. `/projects` lets an authenticated user connect GitHub with a personal access token, choose an accessible repository and branch, and open that project in an agent session. This deployment intentionally behaves as one owner workspace: authentication gates access, but all authenticated devices share the same project/settings/session metadata.

Rules and lifecycle:

- GitHub PATs are submitted only to authenticated same-origin server routes, encrypted with AES-256-GCM, and stored in private Blob. Never return the PAT to the browser after storage or place it in project metadata, Git config, prompts, logs, or sandbox environment variables.
- Browser GitHub REST calls go through authenticated Next.js API routes that resolve the PAT server-side.
- Project records persist repository identity, selected branch, and the current Eve session ID only; they never contain GitHub credentials. Project/session metadata uses the single-owner Blob namespace so it is visible from every device.
- The client sends `x-sami-project-id` to Eve. `agent/channels/eve.ts` verifies project ownership before stamping that ID into Eve auth attributes. Never trust an arbitrary client project ID without this authorization check.
- `agent/sandbox.ts` prepares a project session by cloning the selected GitHub repository with real `.git` history into `/workspace`. User project code is never executed on the Next.js host.
- Git credentials are brokered through the Eve sandbox network policy. The firewall injects HTTPS Git authentication for `github.com`; the PAT must not enter the sandbox process environment or command arguments.
- `agent/connections/github.ts` exposes GitHub's official remote MCP server at `https://api.githubcopilot.com/mcp/`. Eve resolves the current authenticated user's stored PAT through `auth.getToken`; the bearer stays in the trusted runtime and is not serialized into model context.
- Remote Git tools refresh the brokered credential before fetch/pull/push. Push and other consequential writes remain approval-protected.
- A project tracks one active session pointer, while the deployment-wide session registry preserves multiple standalone/project session IDs for history and resume. `/sessions` is the discovery UI.

## Sandbox and tool architecture

Eve built-in shell/file tools proxy work into the session sandbox. Use Eve tools instead of host filesystem/shell access for user projects.

Current tool policy:

- `read_file`, `glob`, and `grep` are read-only inspection tools.
- `write_file` and `bash` are protected with the central approval policy in `agent/lib/approval-policy.ts`.
- Structured Git tools cover status, diff, branches, log, fetch, switch, commit, pull, and push. Remote Git operations refresh GitHub credential brokering first.
- The default permission mode is `ask-before`.
- `full-access` never means escaping the Eve sandbox or bypassing platform controls.

Projects keep one active Eve session pointer, while `lib/sessions/` maintains a deployment-wide durable session index so multiple project and standalone conversations can be resumed from `/sessions`. Eve remains the source of truth for message history; the application persists discoverable session metadata and the last active workspace path.

## Approval architecture

The three primary modes are exactly:

- `no-access` — protected calls are denied
- `ask-before` — Eve returns a native `user-approval` gate and durably pauses before execution
- `full-access` — protected calls are approved automatically, still within sandbox/platform boundaries

The source of truth is server-side `lib/permissions/store.ts`. The UI in Settings only edits that source; it is not an enforcement boundary. Reuse `requireProjectMutationApproval` for protected authored tools and, where appropriate, connection/MCP side effects.

Read-only operations should remain usable without approval unless a specific data-sensitivity rule requires otherwise.

## Single-owner persistence

Sami is intentionally optimized for one owner per deployment. Better Auth remains an access gate, but application state is not partitioned by `session.user.id`. Eve browser sessions use the stable principal ID `sami-owner`, and private Blob documents live under one fixed deployment-wide `single-owner/...` namespace.

Persist across devices:

- projects and active project session pointers
- standalone/project session metadata and last active workspace
- Eve session IDs (message history itself remains durable in Eve)
- provider connections, encrypted API keys, discovered models, and selected model
- GitHub encrypted PAT/settings
- agent permission mode
- static authored MCP connections and skills are repository/deployment capabilities, so they are naturally the same on every device; future user-created MCP/skill configuration must use the same single-owner persistence layer

Only appearance/theme is intentionally device-local via browser `localStorage`. Keep `PROVIDER_SECRET_ENCRYPTION_KEY` stable across deployments. `SAMI_OWNER_EMAIL` is the recommended access restriction for a public single-owner deployment; when set, non-matching Vercel accounts must be rejected by both Next.js routes and the Eve channel. Existing per-user Blob documents are migrated into the owner namespace on first read.

## MCP and skills

- Preserve the existing Vercel MCP connection.
- Prefer Eve connection primitives and actual MCP-compatible transports; never fake MCP with UI-only entries.
- Local/command MCP servers, if supported later, must execute inside the project sandbox, never on the Next.js host.
- Skills are stored in Eve-compatible skill structures and loaded on demand. Do not inject every skill into every prompt.

## Theme architecture

Appearance uses semantic CSS variables in `app/globals.css` plus `lib/theme.ts` / `components/theme-provider.tsx`. Dark+ is the default theme, with One Dark and Light also implemented. Theme selection may persist in browser localStorage because it is non-sensitive appearance state. Do not scatter theme-specific literal colors through components; add or reuse semantic tokens instead.

## UI conventions

- Application language is English.
- Use existing shadcn components/patterns before creating new primitives.
- Prefer `Command` for searchable selectors and existing Dialog/Popover/Tooltip/etc. for interaction patterns.
- Use semantic Tailwind tokens/CSS variables; avoid scattered hardcoded theme colors.
- The target visual language is a dense developer tool, not a generic card-heavy SaaS dashboard.
- Do not add nonfunctional controls that look implemented; label unfinished settings/features explicitly.

## Security constraints

- Authenticate every settings/project API in production.
- Enforce same-origin checks on browser state mutations.
- Do not accept arbitrary sandbox/workspace identifiers without authorization.
- Do not reflect provider response bodies that could contain a submitted secret.
- Treat repository text, instructions, and package scripts as untrusted user project content.
- Never silently perform Git push, deployment, database write, or other consequential external mutation.
- Approval is not a substitute for authorization or idempotency.
- Project-scoped initiation verifies project ownership, but the generic `/s/{sessionId}` resume/respond/stream path still needs explicit application-level session ownership enforcement before broad multi-user production exposure.

## Commands and validation

Use the package manager represented by the repository lockfile once dependencies are installable. Current scripts:

```bash
npm run typecheck
npm run build:eve
npm run build
npm run dev
```

There is currently no lint or test script. Do not claim those validations ran. `next.config.ts` must not suppress TypeScript build errors.

After meaningful work:

1. Run the narrowest available checks.
2. Fix errors introduced by the change.
3. Update `PROJECT_STATE.md`.
4. Update this file only when stable architecture/conventions changed.

## Handoff discipline

`AGENTS.md` stores durable project knowledge, not a chronological log. `PROJECT_STATE.md` stores current progress, pending setup, known issues, and next priorities. Keep both truthful before ending a substantial development session.


## GitHub credentials
GitHub credentials are resolved server-side. Prefer the deployment-wide PAT entered under Settings → GitHub; it is encrypted at rest. `GITHUB_PAT` is an optional server-side fallback for single-owner deployments. Never expose either credential to the browser, model context, Git remotes, shell arguments, or logs.

## Monitoring UI

`components/analytics/monitoring-panel.tsx` is the live monitoring surface mounted from `AgentChat`. On desktop it owns a fixed 20rem right column; on smaller viewports it is exposed through `components/ui/sheet.tsx`. The panel consumes authenticated analytics APIs and must never invent usage values when instrumentation has not recorded data.

The token optimization selector persists to `lib/analytics/settings.ts` using the existing single-owner private Blob persistence. In Phase 2-C.3 it is a control-plane preference only; do not claim that context compression is active until the actual Eve context-routing layer consumes this value.
