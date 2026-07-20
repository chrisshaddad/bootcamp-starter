# Feature I — Audit Log — Progress

**Owner:** Antigravity (original branch) / Claude (this repo's integration)  
**Status:** ✅ Done in this repo — I0/I1 merged (with fixes), I2 dropped by choice  
**Done:** 2 / 2 (this repo's scope)

> Plan: [`../enhancement-plan.md`](../enhancement-plan.md) · Overview: [`PROGRESS.md`](../PROGRESS.md)

> **Partially applied in this repo, with fixes.** Imported for reference from `gym-enhancements-contrast-chat` (a teammate's branch). Brought in: the `AuditLog` schema/migration, `AuditModule`/`AuditService`/`AuditController`, and the logging calls wired into all 8 mutating services (members, plans, subscriptions, sessions, bookings, checkins, instructors, gyms) — completing two spots where the source branch added an `actor` param but never actually called `.log()` (`instructors.service.ts`'s create/update, `gyms.service.ts`'s approve/reject/suspend). The **UI was rebuilt from scratch** (`app/(authenticated)/audit-logs/page.tsx`, `hooks/use-audit-logs.ts`) using this repo's existing Table/Select/Card components and status-color tokens instead of copying the source branch's styling. **I2 (dashboard activity feed) was deliberately dropped** — this repo's dashboard was freshly redesigned in the same session and the user explicitly did not want a second widget added to it; audit history lives only on its own page here. **Two real bugs were found and fixed, not just carried over:**
>
> 1. `entityName` for subscriptions/bookings/check-ins was a synthetic `"Subscription <uuid>"`/`"Booking <uuid>"`/`"CheckIn <uuid>"` string in the source branch — functionally still an ID with a label on it. Fixed to show the actual member name (plus plan/session name where relevant).
> 2. **Cross-tenant leak:** `SUPER_ADMIN` calls resolved `gymId: null`, and the original `list()` only applied the `gymId` filter when truthy — so `null` skipped the filter entirely and returned every gym's audit trail unfiltered. Fixed by always filtering on the exact resolved `gymId` (Prisma treats `{ gymId: null }` as `IS NULL`), and by re-tagging `gyms.service.ts`'s `approve`/`reject`/`suspend` to log with `gymId: null` (platform-level events, about a gym but not that gym's own tenant-internal activity) instead of the target gym's id. `SUPER_ADMIN` now sees only those three platform-level actions; `ORG_ADMIN` sees only their own gym's activity, exactly as before.
>
> **Found via live user testing after the initial integration, also fixed:**
>
> 3. `gyms.service.ts`'s `reactivate()` had no `actor` param and never logged at all (neither in the source branch nor in the first pass here) — added `actor: User`, threaded from the controller, logs `gym.reactivated` with `gymId: null` (same platform-level treatment as approve/reject/suspend).
> 4. The entity-type filter dropdown on `/audit-logs` showed all 8 tenant-scoped options (Member, Plan, Subscription, …) to `SUPER_ADMIN` even though every one of them always returns empty (their view is scoped to `gymId: null`). Split into `TENANT_ENTITY_TYPES` (ORG_ADMIN) vs. `PLATFORM_ENTITY_TYPES` (SUPER_ADMIN: "All activity" + "Gym" only), selected by `user.role` from `useUser()`. Also relabeled the ORG_ADMIN-side "Gym" option to "Settings" — the only Gym-entityType event a tenant admin can ever see is their own `gym.settings-updated`, and sharing the literal label "Gym" with the platform-level filter was confusing.
> 5. `gym.settings-updated` logged a hardcoded `entityName: 'Settings'` — every capacity or brand-color change showed as literally "Settings: Settings" in the table, telling the reader nothing. Fixed to describe the actual change, e.g. `"Max capacity: 42"` or `"Brand color: reset to default"`, built from whichever fields are present in the update payload.

## Phases

| Phase | Title                   | Status | Dev         | Date       | Note                                                                              |
| ----- | ----------------------- | ------ | ----------- | ---------- | --------------------------------------------------------------------------------- |
| I0    | Database & API          | ✅     | Antigravity | 2026-07-18 | AuditLog model + migration, contracts, audit API module, injected into 8 services |
| I1    | Audit Log UI (Admin)    | ✅     | Antigravity | 2026-07-18 | Created use-audit-logs hook, UI page with timeline, and sidebar navigation        |
| I2    | Dashboard Activity Feed | ⬜     | —           | —          | **Dropped in this repo** — not built; see banner above                            |

## Decisions & deviations

_(none yet)_
