# @repo/db

Prisma schema, generated client, migrations, and seeders. Backed by PostgreSQL 18.

## Usage

```typescript
import { prisma } from '@repo/db';
import type { User, Organization } from '@repo/db';
```

## Commands

```bash
npx turbo run db:migrate    # Create + apply a new migration (prompts for name)
npx turbo run db:deploy     # Apply pending migrations only
npx turbo run db:reset      # Drop, recreate, re-migrate, re-seed (destructive)
npx turbo run db:seed       # Run seeders
npx turbo run db:generate   # Regenerate Prisma client
```

## Schema

[`prisma/schema.prisma`](./prisma/schema.prisma) defines two Postgres schemas:

- **`public`** — user-facing models (`User`, `UserProfile`, `Organization`)
- **`private`** — sensitive models (`Session`, `MagicLink`)

## Conventions

See [`../../AGENTS.md`](../../AGENTS.md) for the full set. Highlights:

- UUID primary keys, `createdAt`/`updatedAt` on every mutable model.
- `@@index` on every foreign key.
- Sensitive tables live in the `private` schema.
- Never hand-edit migration SQL.
