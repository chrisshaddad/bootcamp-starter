# MediLink Remodel — Summary of Changes

Branch: `feat/add-prisma-migration-scripts-HJJ`

This document summarizes a full domain remodel of the generic bootcamp-starter
scaffold (multi-tenant "Organizations" SaaS) into **MediLink**, a healthcare
records app built around Institutions (clinics/hospitals/labs), staff,
professionals, and patients. It exists so both teammates and AI coding
assistants working in this repo can get oriented quickly without re-deriving
the reasoning behind each decision.

## What changed, at a glance

| Before | After |
| --- | --- |
| `Organization` (generic SaaS tenant) | `Institution` (clinic/hospital/lab) |
| `UserRole`: `SUPER_ADMIN / ORG_ADMIN / MEMBER` | `UserRole`: `SUPER_ADMIN / INSTITUTION_ADMIN / STAFF / PROFESSIONAL / PATIENT` |
| `UserProfile` (generic profile) | `ProfessionalProfile` + `Patient` (role-specific) |
| — | `Assignment` (care-team links), `MedicalRecord` + subtype detail tables, `RecordFile`, `Prescription`/`PrescriptionItem`, `Notification` |
| `apps/api/src/organizations/` | `apps/api/src/institutions/` |
| `apps/web/hooks/use-organizations.ts` + `organizations/` pages | `use-institutions.ts` + `institutions/` pages |

## Schema decisions worth knowing

- **`email` is globally unique** on `User` (not scoped per institution). Magic-link login only takes an email with no institution selector, so uniqueness has to be global for login to be unambiguous.
- **`username` was removed** from `User` entirely — email is the only login identifier.
- **The enum is named `UserRole`** (not `Role`) — restored to match the original starter's naming convention on purpose.
- **Reserved platform institution**: id `00000000-0000-0000-0000-000000000000`, seeded by `seedUsers.ts`. `SUPER_ADMIN` users attach to this row instead of a real institution, since `User.institutionId` is required (no nullable "platform admin" case). It's explicitly excluded from `GET /institutions` and treated as not-found by `findOne`/`approve`/`reject` in `institutions.service.ts` — it should never appear as a manageable tenant.
- **`institutionId` is denormalized** onto `Patient`, `Assignment`, and `MedicalRecord` (in addition to the FK chain through `User`), so tenant-scoped queries don't need a join to filter by institution.
- **`Institution.status` defaults to `PENDING`**, not `ACTIVE` — new institutions require super-admin approval before going live.
- **No audit trail on institution approval** — unlike the old `Organization` (which tracked `approvedById`/`approvedAt`), `Institution` has no such columns. This was a deliberate scope decision, not an oversight: institutions are approved/rejected via `institutions.service.ts`'s `approve`/`reject`, which only flip `status`.

## Known migration gotcha

Prisma's diff engine generates a broken `AlterEnum` block whenever this migration is regenerated from scratch: it tries to `ALTER TABLE "users"` (the new table name) before that table exists, because the old `User` table is being dropped and a new `users` table created later in the same migration, while the `UserRole` enum name is reused across both. The fix applied by hand each time: delete the generated `BEGIN; CREATE TYPE "UserRole_new" ...; COMMIT;` block, and instead add a plain `DROP TYPE "UserRole"` (after the old `User` table is dropped) and a plain `CREATE TYPE "UserRole"` with the final values (right before `CREATE TABLE "users"`). If this migration is ever regenerated via `prisma migrate dev --create-only`, check for this exact pattern before applying.

The `Assignment` model also has a partial unique index (`assignment_active_unique`, enforcing one active professional per patient) that Prisma's schema DSL can't express — it has to be hand-added to any regenerated migration:
```sql
CREATE UNIQUE INDEX "assignment_active_unique"
ON "public"."assignments"("patientId", "professionalId")
WHERE "status" = 'ACTIVE';
```

## Dev workflow

Same as the original README, with `apps/api/src/institutions` replacing `apps/api/src/organizations`:
```bash
npm run services:init        # docker compose up (postgres, redis, mailpit)
npm install
npx turbo run db:generate
npx turbo run db:deploy       # or db:migrate for a fresh migration
npx turbo run db:seed
npm run dev                   # web :3000, api :3001, mailpit :8025
```

## Code review findings addressed this pass

A structured multi-agent code review was run against this diff. Fixed:
1. `GET /institutions` no longer leaks the reserved platform institution into the list/detail views.
2. `verifyMagicLink`'s response now matches the `UserResponse` contract exactly (extracted a shared `toUserResponse()` mapper in `auth.service.ts`, used by both `verifyMagicLink` and `getCurrentUser`, so the two can't drift apart again).
3. Creating an institution with an admin email that's already in use now returns a clean `409 Conflict` instead of an unhandled 500.
4. `GET /institutions` query params (`status`/`page`/`limit`) are now validated via a proper `institutionListQuerySchema` + `ZodValidationPipe`, instead of unvalidated `parseInt`.
5. `institutions.controller.spec.ts` / `institutions.service.spec.ts` now register mocked providers matching their constructors, so `TestingModule.compile()` doesn't throw `UnknownDependenciesException`.

**Deferred as non-blocking backlog** (found during review, not required for the app to run):
- `StatusBadge`/`STATUS_LABELS` are duplicated (and have already diverged) between `institutions/page.tsx` and `institutions/[id]/page.tsx` — worth extracting into a shared component.
- `institutions.service.ts`'s `approve`/`reject`/`create` do more DB round trips than necessary (e.g. `ensureExists` + `update` + `findOne` where one `update` with a P2025 catch would do).
- `use-institutions.ts`'s `invalidateAll()` double-fetches the detail endpoint on every approve/reject (a broad `mutate()` prefix match also matches the specific detail key already revalidated).
- `InstitutionsService` has no `Logger`, unlike every sibling service.
- Creating an institution never sends an invitation email to the new admin — the pipeline exists (`MAIL_JOBS.SEND_INVITATION` in `mail.processor.ts`) but is unwired. Not a hard blocker: the admin can self-serve a magic link at `/login` once they know their email, but there's no automated onboarding signal.

## Known cross-branch conflict — not yet resolved

`origin/hoda-jad-jeanluc` (this team's shared branch) has a "User management page for Org Admin and Receptionist roles" feature (`apps/api/src/users/`, `apps/web/hooks/use-users.ts`, `apps/web/app/(authenticated)/users/page.tsx`, plus contracts) built on the **pre-remodel** schema (`Organization`, `UserRole: SUPER_ADMIN/ORG_ADMIN/RECEPTIONIST/MEMBER`). It was **not merged** into this branch — merging as-is would not compile, since every file it touches was either deleted or fundamentally rewritten by this remodel.

**Decision**: this remodel is the reference; the Receptionist/Users-management feature will be adapted to it later, not the other way around. When that adaptation happens, the plan is:
- Role mapping: `ORG_ADMIN` → `INSTITUTION_ADMIN` (direct), `RECEPTIONIST` → `STAFF`, `MEMBER` → `PATIENT` (a receptionist creating a "member" maps naturally onto front-desk staff registering a patient).
- Creating a `PATIENT` user this way creates only the bare `User` row, not a `Patient` clinical profile (that's separate future work).
- Keep the existing permission matrix structurally the same, just relabeled (list/update = `INSTITUTION_ADMIN` only; create = `INSTITUTION_ADMIN` any assignable role, `STAFF` restricted to `PATIENT` only).
- Add `phone` to the ported create/update contracts (required on `User`, missing from the original feature).
- Adopt the ported feature's per-role sidebar nav pattern (`NAV_ITEMS_BY_ROLE`), extended to all 5 roles instead of the current binary super-admin/everyone-else split.
- Their migration (`ALTER TYPE "UserRole" ADD VALUE 'RECEPTIONIST'`) is moot — `STAFF` and `PATIENT` already exist in this schema, so no new migration is needed for the port itself.
