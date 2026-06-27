# Coordly

Member and event management for organizations — built on the Bootcamp Starter stack. Multi-tenant auth, org scaffolding, and role-based portals are pre-wired; domain features expand from there.

## What's included

| Layer       | Tech                                                               |
| ----------- | ------------------------------------------------------------------ |
| API         | NestJS 11, Zod validation, BullMQ                                  |
| Web         | Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui, SWR     |
| Database    | PostgreSQL 18 via Prisma                                           |
| Queue       | Redis + BullMQ                                                     |
| Email (dev) | Mailpit (captures magic-link emails locally)                       |
| Build       | Turborepo                                                          |
| AI guidance | Single [`AGENTS.md`](AGENTS.md) for Claude / Cursor / Codex / etc. |

Pre-built: cookie-based magic-link auth, multi-tenant organization model (`SUPER_ADMIN` / `ORG_ADMIN` / `MEMBER` roles), BullMQ-backed email sending.

### Coordly features

| Area                                        | Status      | Routes / notes                                             |
| ------------------------------------------- | ----------- | ---------------------------------------------------------- |
| Admin hub (stats + placeholders)            | Active      | `/admin` — super admin only                                |
| Organizations (approve / reject)            | Active      | `/organizations` — super admin only                        |
| Coordly members (username + role, list)     | Active      | `/members` — super admin + org admin; read-only, no create |
| Events (list, detail, upcoming filter)      | Active      | `/events`, `/events/[id]`; read-only, no create            |
| Event sign-up (eligible users as attendees) | Active      | Detail page → **Sign up to attend**                        |
| Settings                                    | Coming soon | `/settings` — placeholder                                  |
| Announcements, groups                       | Coming soon | —                                                          |
| Full attendance logging / history           | Coming soon | Basic registration exists via `EventAttendee`              |

### Roles

Coordly uses **two separate concepts**. Do not conflate them.

#### Auth roles (`User.role` — who can log in)

Stored on the `User` model. Controls portal access and API authorization.

| Role          | Scope            | Portal access                                       |
| ------------- | ---------------- | --------------------------------------------------- |
| `SUPER_ADMIN` | Platform-wide    | `/admin`, `/organizations`, `/members`, `/events`   |
| `ORG_ADMIN`   | One organization | `/dashboard`, `/members`, `/events`                 |
| `MEMBER`      | One organization | `/dashboard`, `/events` (list defaults to upcoming) |

Super admins are redirected from `/dashboard` to `/admin` after login. Org admins and regular users stay on `/dashboard`.

#### Organization members (`Member` — org staff)

Stored on the `Member` model. These are **organization staff** — admins and presenters — not general attendees.

| Role        | Purpose                                                                |
| ----------- | ---------------------------------------------------------------------- |
| `ADMIN`     | Organization admin (often linked to an `ORG_ADMIN` login via `userId`) |
| `PRESENTER` | Presenter who can be assigned to events                                |

A `Member` may optionally link to a `User` login (`Member.userId`). Org admins who manage members/events are `Member` records with role `ADMIN`.

#### Event participation

| Role          | Backed by                                                                  | Can do                                                                 |
| ------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Presenter** | `Member` with role `ADMIN` or `PRESENTER`                                  | Listed on an event via `presenterId`                                   |
| **Attendee**  | `User` without an org `Member` row, or a `PRESENTER` not hosting the event | Sign up via `POST /events/:id/register`                                |
| **Org admin** | `Member` with role `ADMIN`                                                 | Manage members/events; **cannot** sign up as attendees                 |
| **Presenter** | `Member` with role `PRESENTER`                                             | Host assigned events; may sign up for other upcoming events in the org |

Presenters are `Member` records. Attendees are `User` records (`EventAttendee`). Org admins cannot attend; presenters may attend events they are not hosting.

## Prerequisites

- [Node.js 24.11.1](https://nodejs.org/) (matches `.nvmrc` — use `nvm`/`mise`/`fnm`)
- [Docker Desktop](https://www.docker.com/) — must be **running** before `npm run services:init`

## Quick start

```bash
# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/database/.env.example packages/database/.env

# Start postgres + redis + mailpit (requires Docker Desktop)
npm run services:init

# Install
npm install

# Generate the Prisma client (first run / after schema changes)
npx turbo run db:generate

# Apply migrations to your database
npx turbo run db:deploy

# Seed users, organizations, and Coordly sample data (idempotent — safe to re-run)
npx turbo run db:seed

# Run web + api together
npm run dev
```

| Service                   | URL                     |
| ------------------------- | ----------------------- |
| Web                       | <http://localhost:3000> |
| API                       | <http://localhost:3001> |
| Mailpit (dev email inbox) | <http://localhost:8025> |

## Sign in (magic link)

There are no passwords. In development, sign-in links are **not** sent to a real inbox — they are captured by **Mailpit**.

1. Open <http://localhost:3000/login>
2. Enter a **seeded** email (see below) and click **Send Magic Link**
3. Open **Mailpit** at <http://localhost:8025>
4. Open the newest message and click the sign-in link (`/auth/verify?token=...`)
5. You are redirected to `/dashboard` with a session cookie (`bootcamp_starter_session`); super admins are then sent to `/admin`

Magic links expire after **15 minutes**. Sessions last **7 days**. Request a new link from the login page if needed.

If Mailpit is empty, check that Docker is running, Redis is up (BullMQ sends the email job), and you used an email that exists in the seed data. The API always returns success from the login form even for unknown emails (to avoid account enumeration).

### Seeded accounts

| Role               | Email                            | After login                         | Try this                                                     |
| ------------------ | -------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| Super Admin        | `admin@bootcamp-starter.local`   | `/admin`                            | Platform-wide members & events                               |
| Org Admin          | `admin@techcorp.example.com`     | `/dashboard`, `/members`, `/events` | Manage TechCorp; linked as org `Member` (cannot sign up)     |
| Org Admin          | `admin@greenenergy.example.com`  | `/dashboard`, `/members`, `/events` | Manage Green Energy; linked as org `Member` (cannot sign up) |
| User (attendee)    | `member@techcorp.example.com`    | `/dashboard`, `/events`             | Sign up for upcoming TechCorp events                         |
| User (attendee)    | `member@greenenergy.example.com` | `/dashboard`, `/events`             | Sign up for upcoming Green Energy events                     |
| Presenter (member) | `presenter@techcorp.example.com` | `/dashboard`, `/events`             | Hosts Team Sync; can sign up for other events                |

More seeded auth users: [`packages/database/prisma/seeders/seedUsers.ts`](packages/database/prisma/seeders/seedUsers.ts). Coordly domain members and events (with `startsAt` dates): [`packages/database/prisma/seeders/seedCoordly.ts`](packages/database/prisma/seeders/seedCoordly.ts).

### Event sign-up flow

1. Log in as `member@techcorp.example.com` (no `Member` record) or `presenter@techcorp.example.com` (presents Team Sync only)
2. Open **Events** — list defaults to **Upcoming** for regular users
3. Click an event you are eligible for → **Sign up to attend**
4. Status changes to **Registered**; past events and events you are hosting cannot be signed up for

Org admins (e.g. `admin@techcorp.example.com`) are linked as `Member` ADMIN records and cannot sign up.

## Monorepo layout

| Path                         | Description                                |
| ---------------------------- | ------------------------------------------ |
| `apps/api`                   | NestJS backend                             |
| `apps/web`                   | Next.js frontend                           |
| `packages/database`          | Prisma schema, client, migrations, seeders |
| `packages/contracts`         | Zod schemas shared by api + web            |
| `packages/eslint-config`     | Shared ESLint config                       |
| `packages/typescript-config` | Shared TypeScript configs                  |

## Working with AI assistants

If you use Claude Code, Cursor, Codex, or another AI coding assistant: read [`AGENTS.md`](AGENTS.md) — it documents the conventions and rules every contributor (human or AI) should follow when working in this repo.

The shadcn MCP server is pre-configured in `.vscode/mcp.json` if you want your AI assistant to add UI components directly.

## Quality gates

There are **no local git hooks**. Quality is checked in CI (`.github/workflows/ci.yml`) on every PR:

- `npx turbo run lint`
- `npx turbo run check-types`
- `npm run format:check`

If you want a pre-push check locally, run those three commands yourself or use `npm run format` to auto-fix.

## Database

```bash
npx turbo run db:migrate   # Create + apply a new migration (--name required)
npx turbo run db:deploy    # Apply pending migrations (no new ones)
npx turbo run db:reset     # Drop, recreate, re-migrate, re-seed (destructive)
npx turbo run db:seed      # Run seeders (idempotent)
npx turbo run db:generate  # Regenerate Prisma client
```

Schema lives at [packages/database/prisma/schema.prisma](packages/database/prisma/schema.prisma).

## Troubleshooting

- **Docker / `services:init` fails** — start Docker Desktop and wait until it is fully running, then retry `npm run services:init`.
- **`db:seed` fails with unique constraint on email** — seeders are idempotent; pull latest. If stuck, run `npx turbo run db:reset` (wipes local data).
- **Port already in use** — postgres uses :5433, redis :6380, mailpit :8025/:1025. Stop the conflicting process or change ports in `docker-compose.yml`.
- **No magic link in Mailpit** — confirm `MAILPIT_URL="http://localhost:8025"` in `apps/api/.env`, Redis is running, and the email matches a seeded user exactly.
- **Can't sign up for an event** — you must not be an org `ADMIN` member; presenters cannot sign up for events they host; the event must be upcoming and in your organization.
- **`@repo/contracts` types not found** — run `npx tsc -p packages/contracts` once.
- **Prisma client out of date** — `npx turbo run db:generate`.
- **Docker volume cruft** — `docker compose down -v && npm run services:init` (wipes local DB data; re-run `db:deploy` and `db:seed`).
