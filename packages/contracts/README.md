# @repo/contracts

Zod schemas shared between `apps/api` and `apps/web`. Single source of truth for every request/response shape on the wire.

## Usage

```typescript
import { magicLinkRequestSchema, type MagicLinkRequest } from '@repo/contracts';
```

## Build

```bash
npx tsc -p packages/contracts   # one-off build
npm run dev                     # watch mode (run inside packages/contracts/)
```

Both apps depend on the built output in `dist/`. CI builds this before lint/typecheck.

## Structure

```
src/
  index.ts        # re-exports everything
  common/         # shared primitives (dateSchema, etc.)
  auth/           # /auth/* schemas
  organizations/  # /organizations/* schemas
  users/          # user role + /users/me schemas
```

## Conventions

See [`../../AGENTS.md`](../../AGENTS.md) for the full set. Highlights:

- One schema per file. Export both schema and inferred type.
- No business logic — shape only.
- Update both the folder `index.ts` and the package `index.ts` when adding a file.
