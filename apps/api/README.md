# API

NestJS backend on port 3001.

## Development

```bash
npm run dev          # Start in watch mode
npm run test         # Unit tests
npm run test:e2e     # E2E tests
```

## Generate scaffolding

```bash
nest generate module <name>
nest generate service <name>
nest generate controller <name>
```

## Structure

```
src/
  auth/           # Magic-link auth, guards, decorators, session service
  organizations/  # Multi-tenant org admin endpoints
  database/       # PrismaService — the single Prisma client wrapper
  mail/           # BullMQ queue + processor for outbound email
  common/         # ZodValidationPipe and cross-cutting utilities
```

## Conventions

See [`../../AGENTS.md`](../../AGENTS.md) for the full set. Highlights:

- DTOs come from [`@repo/contracts`](../../packages/contracts/) — never define them in this app.
- Validate every request with `ZodValidationPipe`.
- Database access only through injected `DatabaseService`.
- Tenant-scoped queries always filter by `organizationId`.
