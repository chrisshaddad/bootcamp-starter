# AGENTS.md

Instructions for AI coding assistants (Claude Code, Cursor, Codex, Aider, etc.) working in this repo. Read this file before writing code.

## What this repo is

A generic full-stack bootcamp starter on Turborepo. Multi-tenant auth (orgs + roles) is pre-wired; everything domain-specific is left for the student to build.

## Current build: Gym Management System

We are building a multi-tenant gym management system on this starter (each gym = an `Organization`, gym manager = `ORG_ADMIN`, gym customer = a staff-managed `Member`).

**Before writing any feature code, read [`docs/gym-management-plan.md`](docs/gym-management-plan.md).** It is the source of truth for the data model, the work breakdown, and ownership.

Key rules for this build:

- The database schema lands **first** as Phase 0 (one shared migration) and is **frozen** afterward. Feature workstreams do **not** edit `packages/database/prisma/schema.prisma` or create migrations.
- Work is split into three independent end-to-end features (A: Members/Plans/Subscriptions, B: Sessions/Bookings, C: Check-ins/Dashboard). Build your assigned feature end-to-end (contracts → API → web) within its own folders; only append to the shared files noted in the plan.

## Stack

- **`apps/api`** — NestJS 11 on port 3001
- **`apps/web`** — Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui on port 3000
- **`packages/database`** — Prisma 7 + PostgreSQL 18, exported as `@repo/db`
- **`packages/contracts`** — Zod schemas shared by api + web, exported as `@repo/contracts`
- **Docker services** — Postgres :5433, Redis :6380, Mailpit :8025

## Dev workflow

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/database/.env.example packages/database/.env

npm run services:init                          # docker compose up
npm install
npx turbo run db:migrate -- --name init        # first run only
npx turbo run db:generate                      # in case migrate didn't auto-gen
npx turbo run db:seed                          # optional
npm run dev                                    # web :3000, api :3001, mailpit :8025
```

## Conventions (read before editing)

### Shared contracts — the most important rule

Every request/response shape on the wire is a Zod schema in `packages/contracts/src/<resource>/`. Both the API and the web app import from `@repo/contracts`.

**Never** define a DTO inline in `apps/api` or a request/response type in `apps/web`. If it's on the wire, it lives in contracts. This is the single most-violated rule and the source of most type-drift bugs.

After changing contracts, run `npx tsc -p packages/contracts` to rebuild before downstream type-checking.

### Multi-tenant auth

Three roles: `SUPER_ADMIN` (platform), `ORG_ADMIN` (one org), `MEMBER` (regular user). Most tenant-scoped models will have an `organizationId` FK indexed with `@@index([organizationId])`.

**Every Prisma query on a tenant-scoped model must filter by `organizationId`.** No exceptions. Even `findUnique` should be `findFirst({ where: { id, organizationId } })`. Cross-tenant leakage is the #1 security bug in multi-tenant SaaS.

### NestJS (`apps/api`)

- One folder per feature: `src/<feature>/<feature>.{controller,service,module}.ts`. Register the module in `app.module.ts`.
- Validate every request body / query with `ZodValidationPipe` from `src/common/pipes/`. Schemas come from `@repo/contracts`.
- Database access only through `DatabaseService` (extends `PrismaClient`). Never `new PrismaClient()` outside `packages/database`.
- Routes are protected by default (global `AuthGuard`). Use `@Public()` to opt out, `@Roles(...)` to restrict by role, `@CurrentUser()` to get the calling user.
- Cookie-based sessions (`bootcamp_starter_session`, `HttpOnly`, 30-day TTL). Magic-link auth only — no passwords.
- Async work goes through BullMQ. See `src/mail/` for the canonical pattern: constants → module → service → processor.
- Errors: throw NestJS exceptions (`NotFoundException`, `UnauthorizedException`, `BadRequestException`). Don't return error envelopes.
- Logging: every service uses NestJS's `Logger` (`private readonly logger = new Logger(MyService.name)`). **Never `console.log` in `apps/api/src/`.** `console.*` is fine in CLI scripts under `packages/database/prisma/seeders/` because they're one-shot scripts, not the running server.

### Next.js (`apps/web`)

- Default to server components. Add `'use client'` only when you need state, effects, hooks, or browser APIs.
- Protected routes go under `app/(authenticated)/`. The `proxy.ts` middleware short-circuits unauthed access.
- Data fetching = SWR hooks under `hooks/`, one per resource. Type with `@repo/contracts` types. See `hooks/use-organizations.ts` for the pattern.
- API calls go through `lib/api.ts`. Errors become `ApiError` instances — catch in submit handlers and toast.
- Forms = `react-hook-form` + `zodResolver(<schema from contracts>)`. See `app/login/page.tsx`.
- UI primitives live in `components/ui/` and come from shadcn. **Don't hand-edit them.** Use `npx shadcn@latest add <component>` or the shadcn MCP server (configured in `.vscode/mcp.json`).
- Tailwind v4. Use the design tokens (`primary-base`, `primary-100`, `gray-*`, `error`) defined in `globals.css`.
- Error / loading UX: `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx` provide global defaults. Add route-scoped versions under any segment (e.g., `app/(authenticated)/projects/error.tsx`) when a specific area needs different treatment.
- Don't leave `console.log` in committed code. Use `console.error` for unexpected failures you want surfaced (the `app/error.tsx` boundary already does this); for everything else, surface to the user via `toast`.

### Prisma (`packages/database`)

- Two schemas: `public` for user-facing models, `private` for sensitive data (`Session`, `MagicLink`). Every model declares `@@schema(...)`.
- UUID primary keys (`@id @default(uuid())`), `createdAt`/`updatedAt` on every mutable model.
- Index every FK with `@@index([fkField])`.
- Cascade for owned children, `SetNull` for soft refs.
- Never hand-edit migration SQL. Edit the schema, then run `npx turbo run db:migrate -- --name <change>`.
- Migrations and `prisma generate` are interactive — when scripting, always pass `--name <name>` explicitly to avoid hangs.

### Contracts (`packages/contracts`)

- One schema per file. Filename matches purpose: `<resource>-create.request.ts`, `<resource>-list.response.ts`, `<resource>.response.ts`.
- Export both the schema and the inferred type:
  ```ts
  export const fooSchema = z.object({ ... });
  export type Foo = z.infer<typeof fooSchema>;
  ```
- Update both the folder `index.ts` and `packages/contracts/src/index.ts` after adding a file.
- No business logic (`.refine()` with DB lookups, etc.) — shape only.

## Quality gates

There are **no local git hooks**. CI runs on every PR (`.github/workflows/ci.yml`):

```bash
npx turbo run lint
npx turbo run check-types
npm run format:check
```

Run those three commands locally before pushing if you want a pre-flight check.

## Things NOT to do

- Don't commit `.env` files.
- Don't add Husky / lint-staged / pre-commit hooks. Quality gates live in CI.
- Don't define DTOs in `apps/api` or `apps/web` — put them in `packages/contracts`.
- Don't access Prisma directly from controllers — go through a service that uses `DatabaseService`.
- Don't filter tenant-scoped queries without `organizationId`.
- Don't hand-edit files under `apps/web/components/ui/`.
- Don't hand-edit migration SQL.
- Don't run `prisma migrate dev` without `--name` in scripts — it prompts and will hang.
