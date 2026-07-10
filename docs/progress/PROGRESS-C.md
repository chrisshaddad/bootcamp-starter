# Feature C — Check-ins + Dashboard + QR (Owner 3) · Progress

> Part of the gym progress log. Overview/index: [`../PROGRESS.md`](../PROGRESS.md) ·
> Plan: [`../gym-management-plan.md`](../gym-management-plan.md) (see "Feature C").
>
> **Edit only this file for Feature C work** (avoids cross-feature merge conflicts).
> Build phases in order: build → test → merge → next. Don't start a phase until the
> previous is ✅. Status legend: ⬜ Not started · 🟡 In progress · ✅ Done · 🚧 Blocked.

**Owner:** Antigravity · **Status: 3 / 3 done — ✅ Complete.**

| Phase | Scope                                                                    | Dev         | Status | Date       | Notes / PR                                                                                                  |
| ----- | ------------------------------------------------------------------------ | ----------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------- |
| C1    | Manual check-ins + live occupancy                                        | Antigravity | ✅     | 2026-07-01 | Manual check-ins + live occupancy dashboard implemented                                                     |
| C2    | Dashboard stats + gym settings (`maxCapacity`)                           | Antigravity | ✅     | 2026-07-02 | Dashboard page + DashboardModule + PATCH /gyms/settings + check-in filter pills                             |
| C3    | QR check-in: admin rotating token (Redis) + member scan — needs A4 shell | Antigravity | ✅     | 2026-07-06 | GET /checkins/qr-token (Redis 60s TTL) + POST /me/checkins scan + admin kiosk QR page + member landing page |

> C3 uses A4's `MePortalModule` + the `app/(member)/` shell, and shares the QR token
> contract + Redis key format with Owner 1 — coordinate, and don't merge C3 until A4
> is ✅ (check [`PROGRESS-A.md`](PROGRESS-A.md)).

## Decisions & deviations

- C3: Redis client shared via `AuthModule` exports (`'REDIS_CLIENT'`) so `CheckInsModule` and `MePortalModule` don't duplicate the connection.
- QR token architecture: two Redis keys per gym — `gym-qr-token:<gymId>` → token (reuse detection) and `qr-token:<token>` → gymId (validation). TTL 60s, reused if TTL > 5s, rotated otherwise.
- Admin QR kiosk page lives at `/checkins/qr` (under `(authenticated)` shell); member landing at `/checkin` (under `(member)` shell). `proxy.ts` updated to allow `MEMBER` role on `/checkin*` routes.
- Used `qrcode` npm package for client-side QR canvas rendering (no server-side image generation needed).
- `CheckInsModule` now exports `CheckInsService` so `MePortalModule` can import and reuse `checkIn()` logic without duplicating it.

## Notes for the next agent

_(Feature C is complete — all 3 phases ✅)_

- 2026-07-10 (Claude, post-completion UI tweak): on `dashboard/page.tsx` (C2),
  replaced the inline expand/collapse "Show list" for the **Active Members**
  and **Expiring Soon** cards with a `Dialog` (shared local `ListDialog`
  helper) whose list body scrolls independently (`min-h-0 flex-1
overflow-y-auto`, dialog capped at `85vh`) — the API returns both lists
  uncapped, so a gym with many members had no scroll/height limit on the old
  inline `<ul>`. No API/contract changes. `lint`/`check-types`/`format:check`
  all pass; not yet visually confirmed in a browser (no browser tool in this
  environment).
