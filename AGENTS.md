# AGENTS.md — Forward-Mena

Instructions for AI coding assistants (Claude Code, Cursor, Codex, Aider, …). This is the source of truth for **how to write code here**. Read it before writing code; live architecture + status is in [docs/CONTEXT.md](docs/CONTEXT.md).

## What this repo is

**Forward-Mena** — a multi-org rental-management SaaS. Property owners subscribe ($20/mo) and manage their own staff (supervisor / finance / maintenance) and tenants in a fully data-isolated workspace. **v1** = platform foundation (auth, multi-org RBAC, subscription/payments, timeline, role-aware dashboard shells); the rentals domain is being built (`Building` / `BuildingAssignment` models exist). Turborepo monorepo.

## Stack

- **`apps/web`** (`forward-mena-fe`) — Next.js **16.2.4** + React 19, App Router, bilingual `[lang]` routing (`ar` RTL / `en`), **next-auth v5 (Auth.js) with Keycloak OIDC** (JWT session, no DB adapter), **RTK Query + redux-persist**, Tailwind v4 + shadcn (on `@base-ui/react`), Stripe embedded checkout, **vitest**. **Port 3000.**
- **`apps/api`** (`forward-mena-be`) — NestJS **11**, **Prisma 7** (`@prisma/adapter-pg`), **passport-jwt + jwks-rsa** (validates Keycloak RS256 JWTs), Stripe 22, nestjs-pino, Swagger at `/docs`, `@nestjs/throttler`, **jest**. **Port 4000.**
- **`packages/`** — **empty.** There is **no** shared `@repo/contracts` or `@repo/db` package. Types/DTOs live per-app.
- **Tooling** — **npm** (`npm@11.6.2`, `package-lock.json`), Node **24.11.1** (`.nvmrc`), Turborepo 2.

## Dev workflow

The database is the VPS Postgres reached over an SSH tunnel — see [docs/CONTEXT.md](docs/CONTEXT.md) for the tunnel command and infra. Then:

```bash
npm install            # root (npm workspaces)
npm run dev            # turbo: web :3000 + api :4000
# or per app:
cd apps/api && npm run start:dev    # NestJS :4000, Swagger /docs
cd apps/web && npm run dev          # Next.js :3000  → /en or /ar
```

## Conventions (binding — violating these causes real bugs)

### Keycloak is the source of truth for identity, org membership, and roles — NOT the database
- There are **no `User` or `Membership` tables.** A user *is* their Keycloak `sub`. Org membership is the Keycloak user attribute **`org_id`** (surfaced as a JWT claim via a protocol mapper). Role is a Keycloak **client role** on the web client.
- Never add User/Membership tables or resolve identity/org/role from the DB. Use the JWT claims and `KeycloakAdminService` (KC Admin API) for user CRUD and role/attribute writes.
- Roles, highest→lowest precedence: **`org_admin` > `supervisor` > `finance` > `maintenance` > `tenant`** (`apps/api/src/common/enums`, `apps/web/src/auth/roles.ts`).

### Backend (`apps/api`)
- One folder per feature under `src/modules/<feature>/` (`{controller,service,module}.ts`); register the module in `app.module.ts`.
- Global guards (registered in `AppModule`, order matters): **ThrottlerGuard → JwtAuthGuard → RolesGuard**. Every endpoint requires a valid JWT **by default**. Use `@Public()` to bypass (e.g. `/health`, `/webhooks/stripe`), `@Roles(Role.X)` to restrict, `@CurrentUser()` to read the `AuthenticatedUser`.
- **Org scoping is mandatory.** Every org-scoped action MUST resolve the org via `OrgScopeService.resolveForCaller(user)` (or `resolveOrgId(user)` for pre-payment billing) and filter Prisma with `orgScope.orgWhere(orgId)` (= `{ orgId }`). Never use `user.orgId` directly in a query. Cross-org access → `assertSameOrg` → 403. For `tenant` role, further restrict with `tenantWhere(orgId, userId)`.
- DB access only via `PrismaService` (`infrastructure/prisma`). Schema: **`apps/api/prisma/schema.prisma`**. Models: `Organization, Subscription, Payment, Event, Building, BuildingAssignment`.
- **Role is granted only after payment.** `GET /me` provisions the org on first call (advisory-lock) but NEVER assigns a role; `org_admin` is granted in `BillingService.confirmSession()` after Stripe payment.
- Errors: throw Nest exceptions. Logging: **nestjs-pino** — never `console.log` in `apps/api/src/`. Config: `@nestjs/config` + Joi (`config/env.validation.ts`); boot fails if a required env var is missing.

### Frontend (`apps/web`)
- Server components by default; add `'use client'` only when you need state/effects/browser APIs.
- All pages live under `app/[lang]/` (`ar` RTL / `en`, default `en`). Every user-facing string comes from `i18n/dictionaries/` — **add both locales** for any new string.
- **The browser never calls the backend (`:4000`) directly.** Client calls go through the Next.js BFF at `/api/*` via RTK Query (`baseUrl: '/api'`, `store/api/base-api.ts`).
- **Every BFF route handler under `app/api/` MUST use `forwardRoute('/path')`** (`lib/api/forward.ts`) — e.g. `export const GET = forwardRoute('/me')`. It wraps `auth(...)` so Auth.js writes the rotated Keycloak token back via `Set-Cookie`. A bare `await auth()` inside a handler refreshes in-memory only → eventual `invalid_grant`.
- `session.update()` MUST carry a payload (e.g. `update({ refresh: Date.now() })`) — a bare `update()` is a no-op that never triggers the `jwt` callback. (See memory: post-payment role refresh depended on this.)
- RSC guards `requireSession` / `requireRole` / `requireActiveOrg` (`auth/guards.ts`) are defense-in-depth. `proxy.ts` middleware handles locale + route gating; **paywall gating is intentionally NOT in middleware** (a lagging role claim causes redirect loops) — gate in RSC/components.
- Forms: react-hook-form + zod. UI: shadcn (base-ui) in `components/ui/` — **don't hand-edit**; use the shadcn MCP or CLI. Tailwind v4 tokens. State persisted via redux-persist (`ui`, `auth`, `api` under key `forward-mena`).

### Billing (Stripe)
Embedded checkout: `POST /api/billing/checkout-session` → `{clientSecret}`; after redirect, `BillingConfirmOrchestrator` calls `POST /api/billing/confirm { sessionId }` → backend activates the org + assigns `org_admin` in Keycloak. **Stripe webhooks hit `POST /webhooks/stripe` directly** (`@Public()`, raw body, signature-verified) — never via the BFF.

### Env
Web env is validated by zod at import (`apps/web/src/lib/env.ts`); API env by Joi at boot (`apps/api/src/config/env.validation.ts`). Never print/echo secret values from env files.

## Quality gates

```bash
npm run lint          # turbo run lint across apps
npm run check-types   # turbo run check-types
npm run format:check  # prettier
```
CI (`.github/workflows/ci.yml`, on PR + push to `main`) runs **lint + check-types + format:check**. ⚠️ **CI does not run tests.** Tests exist (web: vitest — `npm run test:run`; api: jest — `npm test`, `npm run test:e2e`) but are not enforced — run them locally for anything behavioral.

## Things NOT to do
- Don't add `User`/`Membership` tables or resolve identity/roles from the DB — **Keycloak is the source of truth**.
- Don't grant a role at `/me` — roles are granted only after payment (`confirmSession`).
- Don't call the backend (`:4000`) directly from the browser — go through the `/api/*` BFF.
- Don't write a BFF route handler without `forwardRoute` — it drops Keycloak token rotation.
- Don't call `session.update()` without a payload.
- Don't query org-scoped data without `OrgScopeService` — cross-org leakage is the #1 risk.
- Don't hand-edit `apps/web/src/components/ui/`. Don't `console.log` in `apps/api/src/` (use pino).
- Don't assume shared packages — `packages/` is empty (no `@repo/contracts`).

<!-- gitnexus:start -->
## GitNexus — Code Intelligence

Indexed by GitNexus as **Forward-Mena**. Use the GitNexus MCP tools to navigate, assess impact, and refactor safely (run `gitnexus analyze` if a tool reports the index is stale; add `--embeddings` for semantic search). Full rules are in [CLAUDE.md](CLAUDE.md) and `~/.claude/CLAUDE.md`.

- **Before editing a symbol:** `gitnexus_impact({target, direction:"upstream"})` — report blast radius; warn on HIGH/CRITICAL.
- **Explore** with `gitnexus_query` / `gitnexus_context` instead of broad grep/Read.
- **Before committing:** `gitnexus_detect_changes()` (the commit gate enforces this).
- **Renames:** `gitnexus_rename`, never find-and-replace.

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Forward-Mena/context` | Codebase overview, index freshness |
| `gitnexus://repo/Forward-Mena/clusters` | Functional areas |
| `gitnexus://repo/Forward-Mena/processes` | Execution flows |
| `gitnexus://repo/Forward-Mena/process/{name}` | Step-by-step trace |
<!-- gitnexus:end -->
