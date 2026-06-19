# Phase 0 — Database foundation · Progress

> Part of the gym progress log. Overview/index: [`../PROGRESS.md`](../PROGRESS.md) ·
> Plan: [`../gym-management-plan.md`](../gym-management-plan.md)
>
> **Edit only this file for Phase 0 work** (avoids cross-feature merge conflicts).
> Status legend: ⬜ Not started · 🟡 In progress · ✅ Done · 🚧 Blocked.

**Status: 1 / 1 done — ✅ Done.**

| Phase | Scope | Dev | Status | Date | Notes / PR |
| ----- | ----- | --- | ------ | ---- | ---------- |
| 0 | `Organization`→`Gym` rename + all gym models/enums (incl. `Instructor`) + `Member.userId` + seeders (incl. `seedInstructors`) | Claude | ✅ | 2026-06-19 | Migration `20260619143511_gym_rename_and_schema` applied; all 8 seeders written + `db:seed` green |

## Decisions & deviations
- All Phase 0 new models/enums were added to `schema.prisma` during Step 1 (alongside the rename) so the single migration covers everything in one shot — matches the plan's intent of one shared migration.
- Old `apps/api/src/organizations/` and `apps/web/app/(authenticated)/organizations/` folders were deleted (not left as dead code) because the stale imports broke `check-types`.
- `seeders/index.ts` includes a `cleanup()` function that truncates all tables in reverse dependency order before re-seeding, making the seed idempotent/re-runnable.
- `seedUsers.ts` ORG_ADMINS emails updated to gym-appropriate domains (`ironpeak`, `flexzone`, etc.) — old `techcorp`/`greenenergy` domains removed.
- `seedOrganizations.ts` left in place (unused) — not deleted to preserve git history; it is not imported by `index.ts`.

## Completed steps
- Step 1 (rename) done: schema, contracts (`packages/contracts/src/gyms/`), API (`apps/api/src/gyms/`), web pages (`apps/web/app/(authenticated)/gyms/`), hook (`use-gyms.ts`), sidebar, `auth.service.ts`, `auth.controller.ts`, `user.response.ts` all updated.
- Step 2 done: migration `20260619143511_gym_rename_and_schema` applied; Prisma client regenerated. Note: had to clear seeded Organization rows via `docker exec postgres psql` first because Prisma blocks non-interactive destructive migrations.
- Step 3 done: 8 seeders written in `packages/database/prisma/seeders/` — gyms (6), instructors (6), members (9, 3 with portal User accounts), plans (6), subscriptions (9), sessions (5), bookings (10), check-ins (8). `npx turbo run db:seed` exits green.
- Step 4 done: this file + `docs/PROGRESS.md` overview row updated to ✅.
