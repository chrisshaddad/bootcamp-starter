# MediLink Test Seed Data

Branch: `medilink-login-theme-redesign`

A Friends-themed, fully-populated test institution so every dashboard stat
and permission path has real, reproducible data to exercise — plus a cleanup
pass on the existing generic sample institutions.

## What changed, at a glance

| Area                      | Before                                                                                                    | After                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Platform Super Admin      | Named "Super Admin"                                                                                       | Named "Hoda Faour"                                                                 |
| Sample institutions       | 6 generic ones (`TechCorp Medical Center`, `DataSync Radiology`, joke admin names like "John Suspicious") | Trimmed to exactly 2 colleague-admin institutions with real-sounding names         |
| Fully-populated test data | None                                                                                                      | New: **Central Perk Medical Center**, staffed and patronized by Friends characters |
| Total institutions        | 7 (platform + 6 samples)                                                                                  | 4 (platform + Central Perk + 2 colleague institutions)                             |

## Design decisions worth knowing

- **`packages/database/prisma/seeders/seedFriendsInstitution.ts`** (new) seeds one institution, Central Perk Medical Center, with:
  - Main characters across all three non-platform roles, so they're easy to log in as and memorize: Monica Geller (Institution Admin); Rachel Green, Chandler Bing, Phoebe Buffay (Staff); Ross Geller (Internal Medicine) and Joey Tribbiani (Neurosurgery, with a Dr. Drake Ramoray bio joke) as Professionals.
  - ~16 minor-character patients with staggered registration dates over the last 28 days (so the dashboard's 30-day trend line has real shape) and mixed care-team assignments — including some deliberately left unassigned, so "Patients with no care team" is non-zero.
  - 13 medical records across all 5 record types, dated so every stat has real signal: some inside and some outside the "this week" window (proves the filter actually filters, not just showing everything), and both overdue and upcoming follow-ups/vaccinations.
- **`seedUsers.ts` / `seedInstitutions.ts` cleanup**: the platform Super Admin is now "Hoda Jad Jean-luc"; the old sample institutions (`TechCorp Medical Center`, `Green Valley Hospital`, `HealthFirst Diagnostics Lab`, `Urban Care Clinic`, `Fraudulent Health Services`, `DataSync Radiology`) were renamed to sound like genuine healthcare orgs and their admin names de-jokified — then trimmed down to exactly two: Cedar Heights Medical Group (Jad Hneiny) and Bellerive Health Clinic (Jean-Luc Kiami), both `ACTIVE` so they're immediately usable test logins.
- **Not idempotent by design** — matches the existing seeders' convention (`create`, not `upsert`, except for the reserved platform institution). Run against a freshly reset database.

## QA steps

1. Run the seed (`npx turbo run db:seed` from a fresh `db:reset`, or `npm run db:seed` from `packages/database`) and confirm it completes without error.
2. Log in as `admin@medilink.local` (Hoda Jad Jean-luc) — confirm `/institutions` shows exactly 3 rows (Central Perk, Cedar Heights Medical Group, Bellerive Health Clinic) — the reserved platform institution is deliberately excluded from that list by design, so 3 is correct, not 4.
3. Log in as Monica Geller (`monica.geller@centralperkmed.example.com`) — sidebar reads "Central Perk Medical Center"; dashboard shows non-zero stats across the board (see `medilink-dashboard-metrics.md` for exact expected numbers).
4. Log in as Rachel Green, Chandler Bing, or Phoebe Buffay — each should show a different "Registered by you this week" count and a distinct "Recent registrations" list.
5. Log in as Ross Geller or Joey Tribbiani — each should show assigned patients, this-week records across all 5 types, and at least one overdue + one upcoming item in both Follow-ups and Vaccinations due.
6. Log in as Jad Hneiny (`jad.hneiny@cedarheightsmedical.example.com`) or Jean-Luc Kiami (`jean-luc.kiami@bellerivehealth.example.com`) — confirm each lands in their own institution with no data bleeding over from Central Perk.

## Still missing / follow-up

- No seed data exists for a Patient login's own `/my-health` view beyond what Central Perk's minor characters provide — fine for current QA needs, but there's no "many records, many follow-ups" patient specifically designed to stress-test that view.
