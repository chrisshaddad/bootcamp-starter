# AGENTS.md

Instructions for AI coding assistants (Claude Code, Cursor, Codex, Aider, etc.) working in this repo. Read this file before writing code.

## What this repo is

A generic full-stack bootcamp starter on Turborepo. Multi-tenant auth (orgs + roles) is pre-wired; everything domain-specific is left for the student to build.

## Current build: Gym Management System

We are building a multi-tenant gym management system on this starter (each gym = a `Gym` — the starter's `Organization` tenant renamed in Phase 0 — gym manager = `ORG_ADMIN`, gym customer = a `Member` that staff can invite to a read-only self-service login as a `MEMBER` user).

**Before writing any feature code:**

1. Read [`docs/PROGRESS.md`](docs/PROGRESS.md) **first** for the project map, then the per-feature file you're working in under [`docs/progress/`](docs/progress/) (`PROGRESS-A.md` / `-B.md` / `-C.md` / `-phase0.md`) for live phase status. It is the team's shared memory; don't re-implement a phase already marked ✅, and continue an 🟡 in-progress phase rather than restarting. Status is split one file per feature so parallel work doesn't cause merge conflicts — **edit only your own feature's file** (plus your single row in the `PROGRESS.md` overview).
2. Read [`docs/gym-management-plan.md`](docs/gym-management-plan.md) — source of truth for the data model, the work breakdown, internal phases, and ownership.

**Definition of Done for a phase — a phase is NOT complete until you do this.** As the final step of every phase, before you consider the work finished or hand back to the user, you **must** update your feature's progress file under [`docs/progress/`](docs/progress/): set the phase's status (✅ done / 🟡 in progress), fill in the dev, date, and a one-line note/PR, update that file's `Done`/`Status` summary, log any deviation in its "Decisions & deviations", **and** update the matching row in the [`docs/PROGRESS.md`](docs/PROGRESS.md) overview. Edit only your own feature's file (+ your overview row) to avoid conflicts. Commit this update together with the phase's code. Treat it as part of the phase itself, not an optional afterthought — an agent that finishes a phase without updating the progress files has not finished the phase.

Key rules for this build:

- The database schema lands **first** as Phase 0 (one shared migration) and is **frozen** afterward. Feature workstreams do **not** edit `packages/database/prisma/schema.prisma` or create migrations.
- Work is split into three independent end-to-end features, one owner each (A: Members/Plans/Subscriptions, B: Sessions/Bookings, C: Check-ins/Dashboard) — each owner also builds the member-portal view for their own domain. Build your assigned feature end-to-end (contracts → API → web) in its own folders, **phase by phase** (build → test → merge → next); only append to the shared files noted in the plan.

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

Three roles: `SUPER_ADMIN` (platform), `ORG_ADMIN` (one gym), `MEMBER` (regular user — incl. a gym customer's login). Most tenant-scoped models will have a `gymId` FK indexed with `@@index([gymId])`.

**Every Prisma query on a tenant-scoped model must filter by `gymId`.** No exceptions. Even `findUnique` should be `findFirst({ where: { id, gymId } })`. Cross-tenant leakage is the #1 security bug in multi-tenant SaaS.

### Swagger API documentation (`apps/api`)

Every controller and endpoint **must** be decorated for Swagger. The docs are served at `http://localhost:3001/docs`.

Required decorators — apply these on every new controller/endpoint, no exceptions:

| Scope            | Decorator                                                                 | Where                                                  |
| ---------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| Controller class | `@ApiTags('resource-name')`                                               | matches the tag registered in `main.ts`                |
| Controller class | `@ApiCookieAuth('session-cookie')`                                        | all protected controllers                              |
| Endpoint method  | `@ApiOperation({ summary: '...', description?: '...' })`                  | every route handler                                    |
| Endpoint method  | `@ApiResponse({ status: 200\|201, description: '...', schema: { ... } })` | success response                                       |
| Endpoint method  | `@ApiResponse({ status: 400, description: 'Validation error' })`          | when body/query is validated                           |
| Endpoint method  | `@ApiResponse({ status: 401, description: 'Not authenticated' })`         | all auth-guarded routes                                |
| Endpoint method  | `@ApiResponse({ status: 403, description: 'Insufficient role' })`         | when `@Roles(...)` is used                             |
| Endpoint method  | `@ApiResponse({ status: 404, description: 'Resource not found' })`        | when `NotFoundException` can be thrown                 |
| Path param       | `@ApiParam({ name: 'id', type: String, description: '...' })`             | every `:param`                                         |
| Query param      | `@ApiQuery({ name: '...', required: false, description: '...' })`         | every `@Query()` — add `enum: MY_ENUM` for enum params, `type: Number` for numeric params |
| Request body     | `@ApiBody({ schema: { ... } })`                                           | every `@Body()` — describe shape inline as JSON schema |

**Import all Swagger decorators from `@nestjs/swagger`.** Do not import from any other package.

**Shared swagger constants:** if two or more endpoints in the same feature share schema shapes (e.g. a `memberSchema` object reused in list + detail responses), extract them to `<feature>.swagger.ts` in the same folder and import from there. Do not duplicate inline.

**`@ApiResponse` must always include `schema:`** on 200/201 responses — a description-only response tells consumers nothing. This is the most commonly missed rule.

Example (ORG_ADMIN-scoped endpoint):

```ts
// members.swagger.ts  ← extract shared shapes here
export const memberSchema = {
  type: 'object',
  properties: {
    id:    { type: 'string', format: 'uuid' },
    name:  { type: 'string' },
    email: { type: 'string', format: 'email' },
  },
};
```

```ts
// members.controller.ts
import { memberSchema } from './members.swagger';

@ApiTags('members')
@ApiCookieAuth('session-cookie')
@Controller('members')
export class MembersController {

  @Post()
  @Roles('ORG_ADMIN')
  @ApiOperation({ summary: 'Create a member', description: 'Creates a new gym member scoped to the caller\'s gym.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name:        { type: 'string', example: 'Jane Doe' },
        email:       { type: 'string', format: 'email', example: 'jane@example.com' },
        phoneNumber: { type: 'string', example: '+1-555-0100' },
        dateOfBirth: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Member created', schema: memberSchema })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async create(@Body() dto: MemberCreateRequest, @CurrentUser() user: User) { ... }
}
```

### NestJS (`apps/api`)

- One folder per feature: `src/<feature>/<feature>.{controller,service,module}.ts`. Register the module in `app.module.ts`.
- Validate every request body / query with `ZodValidationPipe` from `src/common/pipes/`. Schemas come from `@repo/contracts`.
- Query param pipes: use NestJS built-in pipes for primitive query params — `ParseEnumPipe` for enums, `ParseIntPipe` for integers, `DefaultValuePipe` for defaults. Example: `@Query('status', new ParseEnumPipe(MyEnum, { optional: true })) status?: MyEnum` and `@Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number`. Never pass raw query strings to services.
- Database access only through `DatabaseService` (extends `PrismaClient`). Never `new PrismaClient()` outside `packages/database`.
- Routes are protected by default (global `AuthGuard`). Use `@Public()` to opt out, `@Roles(...)` to restrict by role, `@CurrentUser()` to get the calling user.
- Cookie-based sessions (`bootcamp_starter_session`, `HttpOnly`, 30-day TTL). Magic-link auth only — no passwords.
- Async work goes through BullMQ. See `src/mail/` for the canonical pattern: constants → module → service → processor.
- Errors: throw NestJS exceptions (`NotFoundException`, `UnauthorizedException`, `BadRequestException`). Don't return error envelopes.
- HTTP status codes: POST endpoints that create a resource must use `@HttpCode(201)`. NestJS defaults all handlers to 200 — never rely on the default for creation endpoints.
- Controllers stay thin: no Prisma queries, no business logic, no conditional branching in controllers. A controller method should only call one service method and return its result. All logic lives in the service.
- Logging: add `private readonly logger = new Logger(MyService.name)` **only if you call `this.logger` at least once** in that service. Never add it speculatively. **Never `console.log` in `apps/api/src/`.** `console.*` is fine in CLI scripts under `packages/database/prisma/seeders/`.
- JSDoc: add a one-line `/** ... */` JSDoc comment above every public method in services and controllers (e.g. `/** Get all gyms with optional status filter */`). Keep it to one line — describe what the method does, not how.

### Next.js (`apps/web`)

- Default to server components. Add `'use client'` only when you need state, effects, hooks, or browser APIs.
- Protected routes go under `app/(authenticated)/`. The `proxy.ts` middleware short-circuits unauthed access.
- Data fetching = SWR hooks under `hooks/`, one per resource. Type with `@repo/contracts` types. See `hooks/use-gyms.ts` (renamed from `use-organizations.ts` in Phase 0) for the pattern. Add a one-line `/** ... */` JSDoc above each exported hook function.
- API calls go through `lib/api.ts`. Errors become `ApiError` instances — catch in submit handlers and toast.
- Forms = `react-hook-form` + `zodResolver(<schema from contracts>)`. See `app/login/page.tsx`.
- UI primitives live in `components/ui/` and come from shadcn. **Don't hand-edit them.** Use `npx shadcn@latest add <component>` or the shadcn MCP server (configured in `.vscode/mcp.json`).
- Tailwind v4. Use the design tokens (`primary-base`, `primary-100`, `gray-*`, `error`) defined in `globals.css`.
- Error / loading UX: `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx` provide global defaults. Add route-scoped versions under any segment (e.g., `app/(authenticated)/projects/error.tsx`) when a specific area needs different treatment.
- Don't leave `console.log` in committed code. Use `console.error` for unexpected failures you want surfaced (the `app/error.tsx` boundary already does this); for everything else, surface to the user via `toast`.
- Build only what the current phase specifies — don't add UI, hooks, or API calls for a future phase even if you can see it's coming.

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
- Don't filter tenant-scoped queries without `gymId`.
- Don't hand-edit files under `apps/web/components/ui/`.
- Don't hand-edit migration SQL.
- Don't run `prisma migrate dev` without `--name` in scripts — it prompts and will hang.
