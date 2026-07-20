# MediLink Dashboard & Navigation Cleanup

Branch: `medilink-login-theme-redesign`

Removes a dead Settings placeholder, de-duplicates Notifications (it was
linked in three places), and replaces static per-role "quick link" dashboard
cards with real metrics — stat tiles, charts, and a filtered patients link.

## What changed, at a glance

| Area | Before | After |
| --- | --- | --- |
| Settings page | Empty "Coming Soon" placeholder, shown to every role | Removed entirely (nav item + route) — avatar upload (its only planned use) was cancelled; theme toggle already lives in the navbar |
| Notifications | Linked in 3 places (dashboard quick-link card, sidebar nav item, navbar bell) | 2 places: sidebar nav (now the **first** item for every role that has it) + navbar bell; dashboard quick-links removed |
| Dashboard | Static per-role "quick link" cards duplicating sidebar nav | Real metrics: stat tiles, a records-by-type bar chart, a 30-day new-patients trend line, and follow-up/vaccination due-lists |
| Patients list | `search` filter only | Added an `unassigned` filter (URL-syncable via `?unassigned=true`); the dashboard's "Patients with no care team" stat tile links straight into it |

## Design decisions worth knowing

- **Settings had exactly two candidate uses**: theme switching (already in the navbar) and avatar upload (cancelled — no preview capability, would "look bad and useless"). With both gone, the page and its nav entries were deleted outright rather than left as a placeholder. That vacated sidebar/navbar slot is where the new self-service **Profile** page now lives (see `medilink-account-and-access-management.md`).
- **New backend module `apps/api/src/stats/`** — `GET /stats/dashboard` returns a `role`-discriminated union (`InstitutionAdminStats` / `StaffStats` / `ProfessionalStats`; Super Admin and Patient don't have a dashboard, so they're out of scope). This is the first aggregation logic in the codebase — the day/record-type bucketing math lives in pure, unit-tested helpers (`stats.util.ts`) rather than buried inside Prisma calls.
- **Metrics deliberately avoid duplicating what a single sidebar click already shows** — no "total patients" link to `/patients`, for example. The one exception, "Patients with no care team," links to a **filtered** view (`/patients?unassigned=true`) that isn't reachable any other way, which is why it's the one stat tile that's clickable.
- **Two charts were built from scratch**, no new charting library: a single-hue bar chart (records-by-type-this-week) and a trend line (30-day new-patient trend) with a crosshair + tooltip. Both went through a real bug-fix pass:
  - The bar chart originally hardcoded a fixed pixel width via inline `style`, so it never filled its card, and its labels ("Consultation", "Prescription", …) overlapped because each bar's slot was far narrower than the text. Rewritten as a plain HTML/CSS flex layout, fixing both problems by construction.
  - The trend line had a fixed SVG `viewBox` width that let `preserveAspectRatio` letterbox (and silently mis-align the crosshair's hit-testing) on wide containers. Fixed by measuring the container via `ResizeObserver` so the viewBox always matches the rendered pixel size 1:1.
- **`ConsultationDetail.followUpDate` and `VaccinationDetail.nextDoseDate`** existed in the schema but were surfaced nowhere in the UI before this. The Professional dashboard's "Follow-ups due" / "Vaccinations due" lists are the first thing to use them, including overdue items (shown in the error color), not just upcoming ones.

## QA steps

1. Confirm Settings is gone from the sidebar and the navbar avatar dropdown, for every role.
2. Confirm Notifications is the **first** sidebar item for every role that has it, and the navbar bell links to the same place.
3. Confirm the dashboard has no "quick link" cards duplicating sidebar nav items.
4. Log in as an Institution Admin — dashboard shows stat tiles (Total patients, Active staff, Active professionals, Patients with no care team), a records-by-type bar chart, and a 30-day trend line, all with real numbers (see the seeded Friends data in `medilink-seed-data.md`).
5. Log in as Staff — dashboard shows "Patients with no care team" and "Registered by you this week" stat tiles, plus a "Recent registrations" list scoped to that staff member.
6. Log in as a Professional — dashboard shows active-assigned-patients and records-this-week stat tiles, a bar chart, and Follow-ups/Vaccinations due lists (including at least one overdue item in red).
7. Click the "Patients with no care team" stat tile (Admin or Staff) — lands on `/patients` with the "No care team" checkbox pre-checked and the list correctly filtered.
8. Resize the browser window (or check on a smaller viewport) — both charts should resize to fill their card, not show dead whitespace or overlapping labels.

## Still missing / follow-up

- Super Admin and Patient have no dashboard-metrics equivalent — deliberately out of scope (Super Admin's dashboard would need new platform-wide aggregations; Patient uses `/my-health`, not `/dashboard`).
- No automated frontend tests exist for the charts or dashboard layout — the bucketing logic (`stats.util.ts`) has real unit tests since it's pure and non-trivial, but the rest is manual-QA-only, consistent with `apps/web` having no test framework today.
