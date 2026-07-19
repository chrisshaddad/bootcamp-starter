# MediLink Login, Theme & Dashboard Redesign — Summary of Changes

Branch: `medilink-login-theme-redesign`

This document summarizes everything done on this branch so far: the login
page/theme redesign, removing a dead Settings placeholder, consolidating
duplicated Notifications entry points, a new role-based dashboard-metrics
feature (backend stats + charts), a Friends-themed test seed, a clickable
"unassigned patients" stat wired into a new patient-list filter, a care-team
professional-profile view, a self-service account Profile page for every
role, and splitting the patient portal into tabs. It exists so teammates and
AI assistants can orient quickly, in the same spirit as
[`medilink-remodel.md`](./medilink-remodel.md) and
[`medilink-flows-1-5.md`](./medilink-flows-1-5.md).

## What changed, at a glance

| Area | Before | After |
| --- | --- | --- |
| Theme | Green/yellow "bootcamp starter" color tokens | Blue primary theme; secondary demoted to a neutral slate scale |
| Dark mode | Hardcoded Tailwind grays (`bg-white`, `text-gray-900`, …) across authenticated pages | Semantic shadcn tokens (`bg-background`, `text-foreground`, `border-border`, …) so `.dark` renders correctly everywhere; sun/moon toggle in the top navbar |
| Login page | Stock Unsplash photo + "Bootcamp Starter" wordmark; toast + form reset on submit | Real hospital photo + gradient overlay (both themes); inline "Check your email" confirmation screen |
| Sidebar branding | Always read "MediLink" | Super Admin still sees "MediLink"; every other role sees their own institution's name |
| Settings page | Empty "Coming Soon" placeholder, shown to every role | Removed entirely (nav item + route) — avatar upload (its only planned use) was cancelled; theme toggle already lives in the navbar |
| Notifications | Linked in 3 places (dashboard quick-link card, sidebar nav item, navbar bell) | 2 places: sidebar nav (now the **first** item for every role that has it) + navbar bell; dashboard quick-links removed |
| Dashboard | Static per-role "quick link" cards duplicating sidebar nav | Real metrics: stat tiles, a records-by-type bar chart, a 30-day new-patients trend line, and follow-up/vaccination due-lists — see the dedicated section below |
| Patients list | `search` filter only | Added an `unassigned` filter (URL-syncable via `?unassigned=true`); the dashboard's "Patients with no care team" stat tile now links straight into it |
| Care team | Showed name/specialty/phone only | Added a "View Profile" dialog per member showing specialty, bio, phone, and email |
| Account profile | No self-service profile of any kind for any role | New `/profile` page + `Profile` sidebar/navbar entry for **every** role — see the fields table below |
| Patient portal (`/portal`) | One page cramming Administrative + Clinical + Care Team + Records into a single 2-column grid | Split into 3 tabs sharing a layout: **Profile** (Administrative + Clinical combined), **Care Team**, **Records** |
| Seed data | Generic sample institutions (`TechCorp`, `DataSync`, joke admin names) | Renamed to real-sounding healthcare institutions; platform Super Admin is now "Hoda Faour"; exactly 4 institutions total (Platform, Central Perk Medical Center staffed by Friends characters, plus colleague-admin institutions for Jad Hneiny and Jean-Luc Kiami) |

## Design decisions worth knowing

### Theme & login (original scope)

- **Theme is entirely CSS custom properties.** `apps/web/app/globals.css`'s `@theme inline` block defines every color; there is no `tailwind.config.js`. Changing a hex value there re-themes every consuming Tailwind utility class app-wide.
- **The dark-mode pass touched far more files than the palette change alone would require** — most authenticated pages had hardcoded literal grays that don't respond to `.dark` at all; those were replaced with semantic tokens so dark mode actually works app-wide.
- **Success alert color was retuned after the initial rollout**, from cyan (`#0891b2`) to green (`#10a37f`) — cyan didn't read clearly as "success" next to the new blue primary.
- **Magic-link UX moved from toast to an inline confirmation state** — a clearer terminal state for a passwordless flow with no separate confirmation page.
- **Sidebar branding is dynamic per institution** — name-only first slice of dynamic branding (Super Admin keeps "MediLink"; everyone else sees their institution's name via `useMyInstitution`). Logo upload and a "powered by MediLink" demotion are not part of this.
- **`StatusBadge`'s `SUSPENDED` style was corrected** to the new neutral secondary palette.

### Settings removal

- The Settings page had exactly two candidate uses: theme switching (already moved to the navbar) and user avatar upload. Avatar upload was explicitly cancelled — there's no way to preview an uploaded photo today, which would make the feature "look bad and useless." With both candidates gone, the page and its nav entries (sidebar `SECONDARY_NAV_ITEMS`, navbar dropdown link) were deleted outright rather than left as a placeholder.
- That vacated sidebar/navbar slot is exactly where the new **Profile** page now lives (see below) — same real estate, real content this time.

### Dashboard metrics

- New backend module `apps/api/src/stats/` — `GET /stats/dashboard` returns a `role`-discriminated union (`InstitutionAdminStats` / `StaffStats` / `ProfessionalStats`; Super Admin and Patient don't have a dashboard today, so they're not in scope). This is the first aggregation logic in the codebase (previously no `groupBy`/date-range queries existed anywhere) — the day/record-type bucketing math lives in pure, unit-tested helpers (`stats.util.ts`) rather than buried inside Prisma calls.
- Metrics chosen deliberately avoid duplicating what a single sidebar click already shows (that was the entire complaint that started this work) — no "total patients" link to `/patients`, for example. The one exception, "Patients with no care team," links to a **filtered** view (`/patients?unassigned=true`) that isn't reachable any other way, which is why it's the one stat tile that's clickable.
- Two charts were built from scratch (no new charting library dependency): a single-hue bar chart (records-by-type-this-week) and a trend line (30-day new-patient trend) with a crosshair + tooltip. Both went through a real bug-fix pass — the bar chart originally hardcoded a fixed pixel width via inline `style`, so it never filled its card and its labels ("Consultation", "Prescription", …) overlapped because each bar's slot was far narrower than the text; it was rewritten as a plain HTML/CSS flex layout, which fixes both problems by construction. The trend line had a related latent bug — a fixed SVG `viewBox` width let `preserveAspectRatio` letterbox (and silently mis-align the crosshair's hit-testing) on wide containers — fixed by measuring the container via `ResizeObserver` so the viewBox always matches the rendered pixel size 1:1.
- `ConsultationDetail.followUpDate` and `VaccinationDetail.nextDoseDate` existed in the schema but were surfaced nowhere in the UI before this — the Professional dashboard's "Follow-ups due" / "Vaccinations due" lists are the first thing to use them, including overdue items (shown in the error color) not just upcoming ones.

### Care-team profile view & self-service account Profile

- Patients (and staff/admin/professional viewing a patient's care team — it's a shared component) can now open a "View Profile" dialog per care-team member showing specialty, bio, phone, and email. This reuses data already embedded in the patient's own detail response (`careTeamMemberSchema` gained `bio`/`email`) rather than building a new by-id lookup endpoint — a patient can only ever see professionals already on their own care team, so there's no new access-control surface to reason about.
- The new **Profile** page (`/profile`, `GET`/`PATCH /profile/me`) is deliberately narrower than the admin-facing user-update contract:

  | Role | Can edit | Read-only |
  | --- | --- | --- |
  | Super Admin | Full name, Phone | Email, Role, Institution |
  | Institution Admin | Full name, Phone | Email, Role, Institution |
  | Staff | Full name, Phone | Email, Role, Institution |
  | Professional | Full name, Phone, **Bio** | Email, Role, Institution, **Specialty** |
  | Patient | Full name, Phone | Email, Role, Institution |

  Email is never self-editable anywhere (it's the magic-link login identity; no update path exists for it even for admins today). Specialty stays admin-controlled for Professionals — it's a formal classification — while bio is the one field they write themselves, and it's exactly what patients see on the care-team profile view above.

### Patient portal split

- `/portal` was one page rendering Administrative, Clinical, Care Team, and Records sections all at once (each individually substantial — 170–220 lines with its own cards/dialogs). It's now three routes sharing `app/(authenticated)/portal/layout.tsx` (header + tab nav + the role/loading/error guards, checked once): `/portal` (Profile — Administrative + Clinical combined, per an explicit request to keep those two together), `/portal/care-team`, `/portal/records`.
- Fixed a small thing this touched: the sidebar's `isActive` check special-cased `/portal` to exact-match only (originally harmless, since it had no sub-routes) — left as-is, it would've stopped "My Health" from highlighting once `/portal/care-team` and `/portal/records` existed.

### Seed data

- `packages/database/prisma/seeders/seedFriendsInstitution.ts` (new): one fully-populated institution, **Central Perk Medical Center**, staffed by Friends main characters across all three non-platform roles (Monica Geller — Institution Admin; Rachel Green, Chandler Bing, Phoebe Buffay — Staff; Ross Geller, Joey Tribbiani — Professionals, with a Dr. Drake Ramoray bio joke for Joey), and ~16 minor-character patients with staggered registration dates, mixed care-team assignments (including deliberately unassigned patients), and 13 medical records across all 5 record types — dated so every dashboard stat has real, non-trivial data (records both inside and outside the 7-day window, both overdue and upcoming follow-ups/vaccinations).
- `seedUsers.ts` / `seedInstitutions.ts` were cleaned up: the platform Super Admin is now named "Hoda Faour"; the generic sample institutions were renamed to sound like real healthcare orgs (no more `TechCorp`/`DataSync`/joke admin names like "John Suspicious"); the list was trimmed to exactly two colleague-admin institutions (Cedar Heights Medical Group — Jad Hneiny; Bellerive Health Clinic — Jean-Luc Kiami), for a total of 4 institutions including the reserved platform row.

## Dev workflow

Same as the other docs:

```bash
npm run services:init        # postgres, redis, mailpit
npm install
npx turbo run db:generate db:deploy db:seed
npm run dev                   # web :3000, api :3001, mailpit :8025
```

Manual QA:

1. Load `/login` in both light and dark mode — check the hero photo, gradient overlay, and wordmark against each theme; submit the form and confirm the "Check your email" screen.
2. Toggle light/dark from the top navbar across a few authenticated pages — confirm no leftover hardcoded grays break contrast.
3. Log in as an Institution Admin, Staff, or Professional (see the seeded Friends characters above) — confirm the dashboard's stat tiles, bar chart, and (Admin only) trend line render with real numbers, and that "Patients with no care team" navigates to `/patients?unassigned=true` with the filter checkbox pre-checked.
4. As a Professional, open a patient's Care Team section and confirm "View Profile" shows their own specialty/bio/contact details correctly to a patient viewing them.
5. As any role, open `/profile`, edit full name/phone (and, as a Professional, bio), save, and confirm it persists on reload.
6. As a Patient, confirm `/portal` shows three tabs and each renders the right section with no data-fetch waterfall/flicker between them.

## Still missing / follow-up

- Super Admin and Patient have no dashboard-metrics equivalent — deliberately out of scope for this pass (Super Admin's dashboard would need new platform-wide aggregations; Patient uses `/portal`, not `/dashboard`).
- The dedicated "My Institution" page is still hard-gated to `INSTITUTION_ADMIN`; a Patient sees their institution's name in the sidebar but has no page to view a full institution profile.
- Institution logo upload and user avatars are still not built — avatars are explicitly cancelled (no preview capability); institution logo upload remains an open, undecided question.
- No color/contrast accessibility audit has been run against the new blue theme in either light or dark mode.
- No automated frontend tests exist for any of this — the dashboard-stats bucketing logic (`stats.util.ts`) has real unit tests since it's pure and non-trivial, but the charts, portal split, and profile page are manual-QA-only, consistent with `apps/web` having no test framework at all today.
