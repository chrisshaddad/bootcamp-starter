# AGENTS.md — Forward-Mena

Instructions for AI coding assistants (Claude Code, Cursor, Codex, Aider, …). This is the source of truth for **how to write code here**. Read it before writing code; live architecture + status is in [docs/CONTEXT.md](docs/CONTEXT.md).

## What this repo is

**Forward-Mena** — a multi-org rental-management SaaS. Property owners subscribe ($20/mo) and manage their own staff (supervisor / finance / maintenance) and tenants in a fully data-isolated workspace. **v1** = platform foundation (auth, multi-org RBAC, subscription/payments, timeline, role-aware dashboard shells); the rentals domain is being built (`Building` / `BuildingAssignment` models exist). Turborepo monorepo.

## Stack

- **`apps/web`** (`forward-mena-fe`) — Next.js **16.2.4** + React 19, App Router, bilingual `[lang]` routing (`ar` RTL / `en`), **next-auth v5 (Auth.js) with Keycloak OIDC** (JWT session, no DB adapter), **RTK Query + redux-persist**, Tailwind v4 + shadcn (on `@base-ui/react`), Stripe embedded checkout, **vitest**. **Port 3000.**
- **`apps/api`** (`forward-mena-be`) — NestJS **11**, **Prisma 7** (`@prisma/adapter-pg`), **passport-jwt + jwks-rsa** (validates Keycloak RS256 JWTs), Stripe 22, nestjs-pino, Swagger at `/docs`, `@nestjs/throttler`, **jest**. **Port 4000.**
- **`packages/`** — shared internal packages: **`@repo/db`** (`packages/database` — Prisma schema/migrations + generated client, the single source of truth for the DB), **`@repo/contracts`** (shared API types/DTOs consumed by both apps), plus **`@repo/typescript-config`** and **`@repo/eslint-config`**. New cross-app types/DTOs belong in `@repo/contracts`, not per-app.
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

- There are **no `User` or `Membership` tables.** A user _is_ their Keycloak `sub`. Org membership is the Keycloak user attribute **`org_id`** (surfaced as a JWT claim via a protocol mapper). Role is a Keycloak **client role** on the web client.
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
- Don't duplicate cross-app types per-app — put shared API types/DTOs in `@repo/contracts`, and import the DB client/types from `@repo/db` (never re-declare them).

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **bootcamp-starter** (1530 symbols, 3956 relationships, 116 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource                                          | Use for                                  |
| ------------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/bootcamp-starter/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/bootcamp-starter/clusters`       | All functional areas                     |
| `gitnexus://repo/bootcamp-starter/processes`      | All execution flows                      |
| `gitnexus://repo/bootcamp-starter/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
