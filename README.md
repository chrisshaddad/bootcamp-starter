# Bootcamp Starter

A generic full-stack starter for bootcamp projects. Multi-tenant auth scaffolding is wired in; build your features on top.

## What's included

| Layer       | Tech                                                               |
| ----------- | ------------------------------------------------------------------ |
| API         | NestJS 11, Zod validation, BullMQ                                  |
| Web         | Next.js 16 (App Router), React 19, Tailwind v4, shadcn/ui, SWR     |
| Database    | PostgreSQL 18 via Prisma                                           |
| Queue       | Redis + BullMQ                                                     |
| Email (dev) | Mailpit                                                            |
| Build       | Turborepo                                                          |
| AI guidance | Single [`AGENTS.md`](AGENTS.md) for Claude / Cursor / Codex / etc. |

Pre-built: cookie-based magic-link auth, multi-tenant organization model (`SUPER_ADMIN` / `ORG_ADMIN` / `MEMBER` roles), BullMQ-backed email sending.

## Prerequisites

- [Node.js 24.11.1](https://nodejs.org/) (matches `.nvmrc` — use `nvm`/`mise`/`fnm`)
- [Docker](https://www.docker.com/)

## Quick start

```bash
# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp packages/database/.env.example packages/database/.env

# Start postgres + redis + mailpit
npm run services:init

# Install
npm install

# First-time DB setup (prompts for migration name — use "init")
npx turbo run db:migrate

# Optional: seed a super-admin + sample organizations
npx turbo run db:seed

# Run web + api together
npm run dev
```

- Web: <http://localhost:3000>
- API: <http://localhost:3001>
- Mailpit: <http://localhost:8025>

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

Non-trivial features start with a short spec under [`specs/`](specs/). See [`specs/README.md`](specs/README.md) for why and when.

The shadcn MCP server is pre-configured in `.vscode/mcp.json` if you want your AI assistant to add UI components directly.

## Quality gates

There are **no local git hooks**. Quality is checked in CI (`.github/workflows/ci.yml`) on every PR:

- `npx turbo run lint`
- `npx turbo run check-types`
- `npm run format:check`

If you want a pre-push check locally, run those three commands yourself or use `npm run format` to auto-fix.

## Database

```bash
npx turbo run db:migrate   # Create + apply a new migration
npx turbo run db:deploy    # Apply pending migrations (no new ones)
npx turbo run db:reset     # Drop, recreate, re-migrate, re-seed (destructive)
npx turbo run db:seed      # Run seeders
npx turbo run db:generate  # Regenerate Prisma client
```

Schema lives at [packages/database/prisma/schema.prisma](packages/database/prisma/schema.prisma).

## Troubleshooting

- **Port already in use** — postgres uses :5433, redis :6380, mailpit :8025/:1025. Stop the conflicting process or change ports in `docker-compose.yml`.
- **`@repo/contracts` types not found** — run `npx tsc -p packages/contracts` once.
- **Prisma client out of date** — `npx turbo run db:generate`.
- **Docker volume cruft** — `docker compose down -v && npm run services:init` (wipes local DB data).
