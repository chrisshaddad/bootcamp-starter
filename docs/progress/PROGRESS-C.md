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
- 2026-07-20 (Claude, post-completion UX redesign, user-verified in browser):
  replaced the `Dialog`/`ListDialog` popup from the 2026-07-10 note above —
  user feedback (from their mentor) was that a modal for these two cards read
  poorly. **Expiring Soon** is now an inline "Needs Attention" panel rendered
  directly below the stat-card grid (no overlay): sorted soonest-first, each
  row shows member name + plan name (`dashboard.service.ts` now selects
  `plan: { select: { name: true } }` on the subscription query and maps it to
  a new `planName` field on `ExpiringSoonItem`, see `PROGRESS-A.md`/contracts
  for the schema change) + a days-left badge, and links straight to
  `/members/[memberId]`. **Active Members** dropped its list entirely — the
  card itself is now a `Link` to `/members?activeSubscription=true` (see
  `PROGRESS-A.md` for the new API filter this depends on). Also fixed a
  pre-existing bug affecting every stat-card `CardHeader` in this file: the
  header override classes included `flex-row` but never the base `flex`
  utility, so `CardHeader`'s own `grid` base class won and headers rendered
  as stacked rows instead of icon-beside-title — added `flex` alongside
  `flex-row` on all three affected headers. Verified end-to-end with a
  headless-Chromium/Playwright session driven through the real magic-link
  login flow (via Mailpit) against the running local dev stack — confirmed
  visually in screenshots, not just typecheck/lint.
- 2026-07-20 (Claude, post-completion analytics addition, user-verified in
  browser): added two chart panels to `dashboard/page.tsx` via a new
  co-located `app/(authenticated)/dashboard/analytics-panels.tsx`
  (`AnalyticsPanels` → `CheckInTrendChart` + `PlanBreakdownChart`, built on
  `recharts@^3.9.2`, newly added to `apps/web/package.json`): a 30-day daily
  check-in trend (area/line, zero-filled so there are no gaps on quiet days)
  and a plan-mix donut (active subscriptions grouped by plan, top 5 + folded
  "Other"). `dashboard.service.ts` gained two new parallel queries —
  `recentCheckIns` (bucketed client-side by UTC day string, not a raw-SQL
  `date_trunc`, since per-gym check-in volume is small at this app's scale)
  and `activeSubsForPlanBreakdown` (grouped in JS, not Prisma `groupBy`, to
  avoid a second query for plan names) — exposed as `checkInTrend` and
  `subscriptionsByPlan` on `DashboardStatsResponse` (contracts:
  `CheckInTrendPoint`, `PlanBreakdownItem`). Layout is a 5-col grid below the
  stat cards: charts take `lg:col-span-3` (left), `ExpiringSoonPanel` takes
  `lg:col-span-2` (right) — deliberately charts-left/attention-right, chosen
  over the reverse because charts need the wider column for legible x-axis
  labels and a right-side "action needed" rail matches an established
  pattern users already know (email/CRM inboxes). **Chart palette fix
  (touches `globals.css`, read this before adding another chart):** the
  pre-existing `--chart-2`..`--chart-5` defaults failed the dataviz skill's
  colorblind/contrast validator (`validate_palette.js`) — two adjacent pairs
  were nearly indistinguishable. Replaced with a validated garnet →
  blue → amber → green → violet order (both light surface `#ffffff` and
  dark surface `#18181a` pass all checks; CVD separation for one adjacent
  pair sits in the legal-only-with-secondary-encoding 6–8 band, mitigated by
  the direct legend labels both charts already ship). `--chart-1` is
  untouched — it's the only slot Feature D's `deriveThemeTokens()`
  (`lib/theme/color-utils.ts`) recolors per-gym, so it stays the single-series
  trend color and the pie's first categorical slot, keeping both charts on
  brand even for a gym with a customized theme color. **Any future chart
  must reuse `--color-chart-1..5` in that fixed order — do not invent new
  chart color variables, and do not reorder the slots** (the order is the
  CVD-safety mechanism, not cosmetic). Hit a Turbopack dev-cache bug while
  iterating on the `.dark` block specifically (served stale hex values for
  `chart-2..5` after edits, confirmed via direct `curl` of the compiled CSS
  chunk bypassing the browser entirely) — fixed by deleting the stale
  `.next/dev` chunk and restarting the local `next dev` process; no source
  issue, just a cache staleness gotcha worth knowing if a future CSS edit
  silently doesn't apply. Verified end-to-end in both `colorScheme: light`
  and `dark` Playwright sessions against the real dev stack (screenshots +
  tooltip hover), plus a standalone recheck of the shipped hex values against
  the validator. `lint`/`check-types`/`prettier` all clean across
  `packages/contracts`, `apps/api`, `apps/web`.
