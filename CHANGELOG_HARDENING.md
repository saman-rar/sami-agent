# SAMI Agent - Security, Reliability, and Product Hardening

Date: 2026-09-27

This build applies the production-safety fixes that can be implemented safely within the current Next.js + Eve architecture without pretending that browser state or process memory is a durable security boundary.

## Implemented

### Authentication and session safety
- Production now fails closed unless exactly one email is configured in `AUTH_ALLOWED_EMAILS` and `AUTH_ALLOWED_DOMAINS` is empty.
- The application checks the signed-in email before rendering the authenticated agent.
- Vercel OIDC is disabled in production by default and can only be enabled deliberately with `ALLOW_VERCEL_OIDC=true`.
- Better Auth now accepts explicitly configured custom hosts through `AUTH_ALLOWED_HOSTS` in addition to Vercel deployment hosts.
- Session lifetime was reduced to four hours, refresh was restored, and the stateless cookie cache was reduced to five minutes.
- Browser recent-chat history is namespaced by authenticated user ID. This is convenience state only, not an authorization boundary.

### Eve agent limits
- Added per-session input-token ceiling.
- Added per-session output-token ceiling.
- Added per-session token-cost ceiling.
- Added session timeout and compaction threshold.
- Model and default reasoning level can now be selected through `EVE_MODEL` and `EVE_REASONING` environment variables.

### External tools and approvals
- Removed the hard-coded Vercel Connect project identifier.
- Vercel MCP is now optional and configured through `VERCEL_MCP_CONNECT_ID`.
- Added optional GitHub MCP connection through `GITHUB_MCP_CONNECT_ID`.
- Both external MCP connections require a signed-in user and use `always()` approval.
- Broken optional connector initialization is caught so it does not kill the whole agent session.

### File upload hardening
- Maximum five attachments per submission.
- Maximum 8 MiB per attachment.
- Explicit MIME/extension allowlist.
- Extension-based `accept` matching was fixed.
- Rejected files now surface an explanatory UI error.
- Failed blob-to-data conversion no longer falls back to unusable browser-local `blob:` URLs.
- Submission/conversion errors are no longer swallowed.
- Added a visible attachment picker and removable attachment tray.

### Browser/output hardening
- External file and authorization links are restricted to HTTPS.
- Tool input/output shown in the browser is defensively redacted for common secret/token/password/cookie/authorization fields and bearer-token patterns.
- Internal agent errors are mapped to safer user-facing messages instead of rendering raw backend messages.
- Async response handlers now catch failures instead of silently creating unhandled promise rejections.
- Reasoning/status content no longer disappears merely because assistant text has started rendering.

### Build and repository hygiene
- Removed `typescript.ignoreBuildErrors` and made TypeScript errors fatal to production builds.
- Added standard security headers and disabled the `X-Powered-By` header.
- Added `npm run typecheck`, `npm run check`, and `npm run ci` scripts.
- Added GitHub Actions validation on Node 24: install, typecheck, Eve build, Next build.
- Declared npm as the canonical package manager and removed the stray `pnpm-workspace.yaml`.
- Removed generated `tsconfig.tsbuildinfo` from the delivered package.
- Added `.env.example` with production-safe defaults and configuration documentation.
- Replaced the README with production setup, security controls, deployment guidance, and ACL requirements.
- Expanded the agent operating instructions with inspect-before-edit, secret handling, approval, validation, and non-fabrication rules.
- Centralized public app name and upload policy configuration.

## Deliberately not faked / still requires infrastructure

### Durable multi-user session ACL
Eve sessions are addressed by session ID. Authentication by itself does not prove that the authenticated user owns an arbitrary session ID. A real multi-user deployment therefore needs a durable server-side mapping such as `{sessionId, ownerUserId}` in Postgres, Redis, or KV, enforced on create, continue, stream, and control/cancel paths.

This build mitigates the risk by **failing closed to exactly one production user**. Do not loosen that rule until a durable ACL is connected.

### Distributed request-rate limiting
Token/output/cost/session-duration ceilings are now enforced. A distributed requests-per-minute limiter still needs durable shared state (for example Redis/Upstash) or a platform/WAF rate-limit facility. An in-memory counter would be ineffective across serverless instances and was intentionally not presented as a production fix.

### Persistent conversation management
A lightweight per-user recent-session menu is implemented in browser local storage. Cross-device history, rename, archive, delete, search, and authoritative ownership require persistent server-side storage.

### Full Git repository lifecycle
GitHub MCP access is available when configured, with mandatory approvals. A complete coding-agent repository workflow (clone/import, branch policy, sandbox persistence, commit, push, conflict recovery, PR workflow) requires explicit workspace/repository persistence and has not been falsely represented as complete.

### Dashboard and Todo persistence
The supplied project did not contain durable data models/APIs for these features. They were not fabricated as UI-only placeholders.

### Dynamic provider/custom-model UI
The model and reasoning level are now environment-configurable and actually reach Eve. A user-facing capability-driven model/provider/custom-model selector with per-user/project/session persistence requires a configuration store and a broader provider architecture. It remains a product feature rather than a security patch.

### Dependency upgrades
`eve` and `@vercel/connect` were not blindly upgraded in this hardening pass because their APIs are version-sensitive. Upgrade them in a separate dependency migration after running the Node-24 test/build suite.

## Validation performed
- Removed transient `node_modules`, `.next`, and `tsconfig.tsbuildinfo` from the delivery.
- Syntax-parsed all 43 TypeScript/TSX files successfully with TypeScript's transpiler.
- Cross-checked the Eve APIs used for approvals, dynamic connections, session limits, and reasoning configuration against Eve documentation.

## Validation limitation
The execution container used for this change has Node.js 22.16.0. This repository declares Node.js 24.x, and the installed Eve version requires Node 24. A clean `npm ci` therefore could not be completed reliably here, so a full dependency-resolved `npm run check` was not claimed.

The included GitHub Actions workflow runs the correct validation chain on Node 24:

```text
npm ci
npm run typecheck
npm run build:eve
npm run build
```

Run the same sequence on a Node 24 machine before production deployment.

## Production configuration checklist
1. Set `BETTER_AUTH_SECRET` to a long random secret.
2. Set `VERCEL_APP_CLIENT_ID` and `VERCEL_APP_CLIENT_SECRET`.
3. Set `AUTH_ALLOWED_EMAILS` to exactly one production email.
4. Leave `AUTH_ALLOWED_DOMAINS` unset/empty.
5. Add every custom production domain to `AUTH_ALLOWED_HOSTS`.
6. Keep `ALLOW_VERCEL_OIDC=false` unless a service-to-service requirement is explicitly reviewed.
7. Configure `VERCEL_MCP_CONNECT_ID` only if Vercel tools are needed.
8. Configure `GITHUB_MCP_CONNECT_ID` only if GitHub tools are needed.
9. Keep the minimum OAuth/Connect scopes required by the intended operations.
10. Run `npm run check` on Node 24 and confirm the CI workflow is green before deploying.
