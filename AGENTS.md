---
description:
alwaysApply: true
---

# AGENTS.md

Instructions for AI coding assistants (Claude Code, Cursor, Codex, Aider, etc.) working in this repo. Read this file before writing code.

## What this repo is

**Coordly** — member and event management for organizations. Built on the Bootcamp Starter Turborepo stack.

Multi-tenant auth (orgs + auth roles) is pre-wired. Phase 1 includes Coordly domain models (`Member`, `Event`, `EventAttendee`), role-based portals, event detail pages, and auth-member event sign-up. Announcements, groups, and full attendance history are planned next.

Human-facing setup and sign-in steps live in [`README.md`](README.md).

## Stack

- **`apps/api`** — NestJS 11 on port 3001
- **`apps/web`** — Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui on port 3000
- **`packages/database`** — Prisma 7 + PostgreSQL 18, exported as `@repo/db`
- **`packages/contracts`** — Zod schemas shared by api + web, exported as `@repo/contracts`
- **Docker services** — Postgres :5433, Redis :6380, Mailpit :8025 (dev magic-link inbox)

## Dev workflow

Docker Desktop must be running before `npm run services:init`.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/database/.env.example packages/database/.env

npm run services:init                          # docker compose up
npm install
npx turbo run db:generate                      # first run / after schema changes
npx turbo run db:deploy                        # apply pending migrations
npx turbo run db:seed                          # idempotent — safe to re-run
npm run dev                                    # web :3000, api :3001, mailpit :8025
```

New schema changes: `npx turbo run db:migrate -- --name <change>` (always pass `--name`).

Seeders use `upsert` / skip-if-exists — re-running `db:seed` must not fail on duplicate emails or records.

### Local sign-in (magic link)

No passwords. Dev emails go to **Mailpit** at <http://localhost:8025>, not a real inbox.

1. <http://localhost:3000/login> → enter a seeded email → **Send Magic Link**
2. Open Mailpit → click the link in the newest message
3. Session cookie: `bootcamp_starter_session`

Key seeded accounts — see `packages/database/prisma/seeders/seedUsers.ts`:

| Auth role     | Email                          | Use case                    |
| ------------- | ------------------------------ | --------------------------- |
| `SUPER_ADMIN` | `admin@bootcamp-starter.local` | `/admin` hub                |
| `ORG_ADMIN`   | `admin@techcorp.example.com`   | `/members`, `/events`       |
| `MEMBER`      | `member@techcorp.example.com`  | Sign up for upcoming events |

Requires Redis (BullMQ mail queue) and `MAILPIT_URL="http://localhost:8025"` in `apps/api/.env`.

## Coordly domain

### Do not conflate these concepts

| Concept            | Model / enum                                              | Purpose                                                               |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------- |
| **Auth user**      | `User`, `UserRole` (`SUPER_ADMIN`, `ORG_ADMIN`, `MEMBER`) | Magic-link login, platform/org access                                 |
| **Coordly member** | `Member`, `MemberRole` (`ADMIN`, `PRESENTER`)             | Org staff; can **present** events; presenters may attend other events |
| **Event attendee** | `EventAttendee` → auth `User`                             | Users who sign up to attend (not org admins; not hosting that event)  |

Contracts: `userRoleSchema` vs `memberRoleSchema`. Never reuse one enum for the other.

**Presenters** are Coordly `Member` records (`Event.presenterId`). **Attendees** are auth `User` records (`EventAttendee.userId`). Org `ADMIN` members cannot register; `PRESENTER` members may register for events they are not hosting.

### Prisma models (tenant-scoped)

- **`Member`** — `username`, `role`, `organizationId`; `@@unique([organizationId, username])`
- **`Event`** — `eventName`, `startsAt`, `presenterId` (→ `Member`, `onDelete: SetNull`), `organizationId`
- **`EventAttendee`** — `eventId`, `userId`, `organizationId`; `@@unique([eventId, userId])`

All index `organizationId`. On attendee create, set `organizationId` from the event (same org as `@CurrentUser()`). Seed data: `packages/database/prisma/seeders/seedCoordly.ts` (events include relative `startsAt` dates).

### Web routes

| Route            | Auth roles                           | Notes                                            |
| ---------------- | ------------------------------------ | ------------------------------------------------ |
| `/admin`         | `SUPER_ADMIN`                        | Hub: stats + feature placeholder cards           |
| `/members`       | `SUPER_ADMIN`, `ORG_ADMIN`           | List Coordly members (org-scoped for admins)     |
| `/events`        | `SUPER_ADMIN`, `ORG_ADMIN`, `MEMBER` | List with All / Upcoming / Past filter           |
| `/events/[id]`   | `SUPER_ADMIN`, `ORG_ADMIN`, `MEMBER` | Detail; sign-up button for eligible auth members |
| `/organizations` | `SUPER_ADMIN`                        | Platform org management                          |
| `/dashboard`     | org users                            | Super admins redirect to `/admin`                |

Sidebar: org admins see **Members** + **Events**; auth **MEMBER** users see **Events** only (`apps/web/components/app-sidebar.tsx`).

### API

| Endpoint                    | Module                        | Auth roles                           | Notes                                                   |
| --------------------------- | ----------------------------- | ------------------------------------ | ------------------------------------------------------- |
| `GET /members`              | `apps/api/src/members/`       | `SUPER_ADMIN`, `ORG_ADMIN`           |                                                         |
| `GET /events`               | `apps/api/src/events/`        | `SUPER_ADMIN`, `ORG_ADMIN`, `MEMBER` | Query: `upcoming=true\|false`, `page`, `limit`          |
| `GET /events/:id`           | `apps/api/src/events/`        | `SUPER_ADMIN`, `ORG_ADMIN`, `MEMBER` | Includes `canRegister`, `isRegistered`, `attendeeCount` |
| `POST /events/:id/register` | `apps/api/src/events/`        | `SUPER_ADMIN`, `ORG_ADMIN`, `MEMBER` | Upcoming events in caller's org; see registration rules |
| `GET /organizations`        | `apps/api/src/organizations/` | `SUPER_ADMIN`                        |                                                         |

List/detail query validation via `ZodValidationPipe` + schemas from `@repo/contracts`.

Org-scoped callers are pinned to `user.organizationId` via `resolveOrganizationScope()` in `apps/api/src/common/organization-scope.ts`. Super admins may access all orgs or filter by optional `organizationId` query param.

Event registration rules (enforced in `EventsService.register`):

- Caller must not be an org `Member` with role `ADMIN`
- Presenters (`Member` role `PRESENTER`) cannot register for events they are hosting (`presenterId`)
- Users without a `Member` row, and eligible presenters, may register
- Event must be upcoming (`startsAt > now`) and visible in caller's org scope
- No duplicate registration (`@@unique([eventId, userId])`)

### Reference implementations

| Layer     | Organizations (platform)                | Members / Events (Coordly)                                         |
| --------- | --------------------------------------- | ------------------------------------------------------------------ |
| Contracts | `packages/contracts/src/organizations/` | `members/`, `events/`                                              |
| API       | `apps/api/src/organizations/`           | `members/`, `events/`                                              |
| Web hooks | `hooks/use-organizations.ts`            | `use-members.ts`, `use-events.ts` (incl. `useEvent`, `register()`) |
| Web pages | `app/(authenticated)/organizations/`    | `admin/`, `members/`, `events/`, `events/[id]/`                    |

### Planned (out of scope)

Announcements, groups, create/edit forms for members and events, attendance logging per event session, attendance history views.

## Conventions (read before editing)

### Shared contracts — the most important rule

Every request/response shape on the wire is a Zod schema in `packages/contracts/src/<resource>/`. Both the API and the web app import from `@repo/contracts`.

**Never** define a DTO inline in `apps/api` or a request/response type in `apps/web`. If it's on the wire, it lives in contracts. This is the single most-violated rule and the source of most type-drift bugs.

After changing contracts, run `npx tsc -p packages/contracts` to rebuild before downstream type-checking.

### Multi-tenant auth

Three **auth** roles: `SUPER_ADMIN` (platform), `ORG_ADMIN` (one org), `MEMBER` (regular user). Tenant-scoped models have an `organizationId` FK indexed with `@@index([organizationId])`.

**Every Prisma query on a tenant-scoped model must filter by `organizationId`.** No exceptions. Even `findUnique` should be `findFirst({ where: { id, organizationId } })`. Cross-tenant leakage is the #1 security bug in multi-tenant SaaS.

On create, set `organizationId` from `@CurrentUser()` or from the parent record — never trust the client for tenant ID.

### NestJS (`apps/api`)

- One folder per feature: `src/<feature>/<feature>.{controller,service,module}.ts`. Register the module in `app.module.ts`.
- Validate every request body / query with `ZodValidationPipe` from `src/common/pipes/`. Schemas come from `@repo/contracts`.
- Database access only through `PrismaService` (`src/database/prisma.service.ts`, extends `PrismaClient`). Never `new PrismaClient()` outside `packages/database`.
- Routes are protected by default (global `AuthGuard`). Use `@Public()` to opt out, `@Roles(...)` to restrict by role, `@CurrentUser()` to get the calling user.
- Cookie-based sessions (`bootcamp_starter_session`, `HttpOnly`, 7-day TTL). Magic-link auth only — no passwords.
- Async work goes through BullMQ. See `src/mail/` for the canonical pattern: constants → module → service → processor.
- Errors: throw NestJS exceptions (`NotFoundException`, `UnauthorizedException`, `BadRequestException`, `ForbiddenException`). Don't return error envelopes.
- Logging: every service uses NestJS's `Logger` (`private readonly logger = new Logger(MyService.name)`). **Never `console.log` in `apps/api/src/`.** `console.*` is fine in CLI scripts under `packages/database/prisma/seeders/`.

### Next.js (`apps/web`)

- Default to server components. Add `'use client'` only when you need state, effects, hooks, or browser APIs.
- Protected routes go under `app/(authenticated)/`. Auth boundary via `apps/web/proxy.ts` (session cookie check).
- Data fetching = SWR hooks under `hooks/`, one per resource. Type with `@repo/contracts` types. See `hooks/use-organizations.ts` and `hooks/use-events.ts` for patterns.
- API calls go through `lib/api.ts`. Errors become `ApiError` instances — catch in submit handlers and toast.
- Forms = `react-hook-form` + `zodResolver(<schema from contracts>)`. See `app/login/page.tsx`.
- UI primitives live in `components/ui/` and come from shadcn. **Don't hand-edit them.**
- Tailwind v4. Use design tokens (`primary-base`, `primary-100`, `gray-*`, `error`) from `globals.css`.
- Don't leave `console.log` in committed web code.

### Prisma (`packages/database`)

- Two schemas: `public` for user-facing models, `private` for sensitive data (`Session`, `MagicLink`). Every model declares `@@schema(...)`.
- UUID primary keys, `createdAt`/`updatedAt` on every mutable model.
- Index every FK with `@@index([fkField])`.
- Cascade for owned children, `SetNull` for soft refs (e.g. `Event.presenterId`).
- Never hand-edit migration SQL. Edit the schema, then run `npx turbo run db:migrate -- --name <change>`.
- Seeders must be idempotent (`upsert`, skip-if-exists) — `db:seed` is re-runnable.

### Contracts (`packages/contracts`)

- One schema per file. Filename matches purpose: `<resource>-create.request.ts`, `<resource>-list.response.ts`, `<resource>-list.query.ts`, `<resource>-detail.response.ts`, `<resource>.response.ts`.
- Export both the schema and the inferred type.
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
- Don't access Prisma directly from controllers — go through a service that uses `PrismaService`.
- Don't filter tenant-scoped queries without `organizationId` (except `@Roles('SUPER_ADMIN')` platform list/detail endpoints).
- Don't hand-edit files under `apps/web/components/ui/`.
- Don't hand-edit migration SQL.
- Don't run `prisma migrate dev` without `--name` in scripts — it prompts and will hang.
- Don't conflate auth `User` / `UserRole` with Coordly `Member` / `MemberRole`.
- Don't let auth users become presenters — presenters are Coordly `Member` records only.
- Don't allow non-`MEMBER` auth roles to register as event attendees.
