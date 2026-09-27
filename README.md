# Sami Agent

A Next.js + eve coding-agent application with Better Auth, optional Vercel/GitHub MCP connections, attachment support, and production safety controls.

## Requirements

- Node.js 24.x
- npm (the repository declares its package-manager version)
- A Vercel OAuth app for application sign-in
- AI Gateway/model access for the configured eve model
- Optional Vercel Connect grants for Vercel and GitHub MCP integrations

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

`npm run dev` starts the Next.js application. Use `npm run dev:eve` when working directly with the eve runtime.

## Required production environment variables

| Variable | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Long random signing/encryption secret for Better Auth. |
| `VERCEL_APP_CLIENT_ID` | Vercel OAuth application client ID. |
| `VERCEL_APP_CLIENT_SECRET` | Vercel OAuth application secret. |
| `AUTH_ALLOWED_EMAILS` | Exactly one production user is allowed until a durable session-owner ACL is connected. |
| `AUTH_ALLOWED_HOSTS` | Comma-separated custom domains accepted by Better Auth. Vercel deployment hostnames are included automatically. |

Optional runtime settings are documented in `.env.example`.

## External connections

Connections are disabled unless their Vercel Connect ID is configured:

- `VERCEL_MCP_CONNECT_ID`
- `GITHUB_MCP_CONNECT_ID`

Both connections use an `always()` approval policy. The user must approve every externally mutating/tool call exposed by these MCP servers. Keep the OAuth grant scopes as narrow as possible.

## Safety controls

The application includes the following production controls:

- TypeScript build errors fail production builds.
- Production fails closed to exactly one explicitly allowed email until a durable session-owner ACL is connected.
- Vercel OIDC callers are disabled by default and must be explicitly enabled with `ALLOW_VERCEL_OIDC=true`.
- Vercel/GitHub MCP connections require a signed-in user and per-call approval.
- Agent sessions have input/output token, token-cost, duration, and compaction limits.
- Attachments are limited to five files, 8 MiB each, and an explicit MIME/extension allowlist.
- Tool output shown in the browser is defensively redacted for common secret/token fields.
- External authorization/file links are restricted to HTTPS.
- Browser chat history is namespaced by authenticated user ID and kept only in local storage.
- Basic security headers are emitted by Next.js.

## Session ownership / ACL requirement

Authentication identifies the caller, but eve's canonical session routes are addressed by durable session ID. For a true multi-user production deployment, add an application-owned durable session ownership store and enforce the mapping on **create, continue, cancel/control, and stream** routes. This repository intentionally does not pretend an in-memory or browser-only registry provides that security boundary.

Until that durable ACL is connected, this hardened build deliberately rejects multi-user production configuration. `AUTH_ALLOWED_EMAILS` must contain exactly one address and `AUTH_ALLOWED_DOMAINS` must be empty.

A typical implementation stores `{ sessionId, ownerUserId }` in Postgres/Redis/KV when a session is created and rejects any subsequent route where the authenticated principal does not match the stored owner. This must protect direct `/eve/v1/session/*` access, not only the `/s/[sessionId]` page.

## Validation

Run:

```bash
npm run typecheck
npm run build:eve
npm run build
```

Or run all gates:

```bash
npm run check
```

The GitHub Actions workflow under `.github/workflows/ci.yml` runs these checks on pushes and pull requests.

## Deployment

Configure the production variables first, then deploy normally through Vercel/eve. Do not commit real secrets or Vercel Connect credentials. Use separate Connect grants/projects for staging and production where possible.
