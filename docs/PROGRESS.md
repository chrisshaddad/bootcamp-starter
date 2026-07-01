# Gym Management System — Progress Log (index)

**Shared source of truth for what's built.** Read this **first** (devs _and_ AI
agents) to get the project map, then open the per-feature file for the work you're
doing. This is how an AI agent gets context without starting from scratch.

> Plan / spec: [`gym-management-plan.md`](gym-management-plan.md) ·
> Schema: [`schema-overview.md`](schema-overview.md) · Conventions:
> [`../AGENTS.md`](../AGENTS.md)

## Why this is split into multiple files

Detailed, frequently-updated status lives in **one file per feature** under
[`progress/`](progress/). Each owner edits **only their own file**, so two devs
working in parallel never touch the same file — **no merge conflicts**. This index
is thin and changes rarely (only the one summary row per area, which each owner
updates in place).

**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Done · 🚧 Blocked

## Overview

Current overall state: **Phase 0 complete** — schema, migration, and all seeders done. Feature work (A/B/C) is now unblocked.

| Area                                                                          | Owner       | Done  | Status | Details (edit here)                                                                        |
| ----------------------------------------------------------------------------- | ----------- | ----- | ------ | ------------------------------------------------------------------------------------------ |
| Phase 0 — DB + `Gym` rename                                                   | Claude      | 1 / 1 | ✅     | [`progress/PROGRESS-phase0.md`](progress/PROGRESS-phase0.md)                               |
| Feature A — Gym registration / Members / Plans / Subscriptions + portal shell | Claude      | 5 / 5 | ✅     | [`progress/PROGRESS-A.md`](progress/PROGRESS-A.md) — A0–A4 ✅ all merged — B3/C3 unblocked |
| Feature B — Instructors / Sessions / Bookings + My-bookings                   | Antigravity | 4 / 4 | ✅     | [`progress/PROGRESS-B.md`](progress/PROGRESS-B.md) — B0-B3 ✅ all done                     |
| Feature C — Check-ins / Dashboard + QR check-in                               | Antigravity | 1 / 3 | 🟡     | [`progress/PROGRESS-C.md`](progress/PROGRESS-C.md) — C1 ✅ done                            |

## How to use these files

**For AI agents — at the start of a task:**

1. Read this index for the map, then read the relevant `progress/PROGRESS-*.md`.
   Don't re-implement a phase marked ✅; continue a 🟡 phase rather than restarting.
2. Respect dependencies (see the plan): B3 and C3 need A4's portal shell; B/C
   phases reference members from A1. Check the other feature's file before starting
   dependent work.
3. When you finish a phase (built + tested + merged), update **its row** in that
   feature's `progress/PROGRESS-*.md` (status, dev, date, one-line note) and the
   feature's `Done`/`Status` summary, **and** the matching row in the Overview
   table above. Log deviations and hand-off notes in the feature file. This is part
   of finishing the phase — see the Definition of Done in [`../AGENTS.md`](../AGENTS.md).

**For developers:**

- Touch only your own feature's file (and your single row in the Overview). Set 🟡
  when you start a phase, ✅ when it's merged; keep the **Dev** column accurate.
- Log any deviation from the plan in your feature file's **Decisions & deviations**
  so other devs' agents stay in sync.
