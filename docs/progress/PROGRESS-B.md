# Feature B — Sessions + Bookings (Owner 2) · Progress

> Part of the gym progress log. Overview/index: [`../PROGRESS.md`](../PROGRESS.md) ·
> Plan: [`../gym-management-plan.md`](../gym-management-plan.md) (see "Feature B").
>
> **Edit only this file for Feature B work** (avoids cross-feature merge conflicts).
> Build phases in order: build → test → merge → next. Don't start a phase until the
> previous is ✅. Status legend: ⬜ Not started · 🟡 In progress · ✅ Done · 🚧 Blocked.

**Owner:** _unassigned_ · **Status: 0 / 4 done — ⬜ Not started.**

| Phase | Scope                                                                           | Dev | Status | Date | Notes / PR |
| ----- | ------------------------------------------------------------------------------- | --- | ------ | ---- | ---------- |
| B0    | Instructors CRUD + `GET /instructors/available` (overlap detection)             | —   | ⬜     | —    | —          |
| B1    | Sessions admin schedule (CRUD + cancel, `_count.bookings`, instructor dropdown) | —   | ⬜     | —    | —          |
| B2    | Bookings + per-session capacity (reject full/duplicate)                         | —   | ⬜     | —    | —          |
| B3    | Member "My bookings" portal view (`GET /me/bookings`) — needs A4 shell          | —   | ⬜     | —    | —          |

> B0 must be ✅ before starting B1 — sessions reference `instructorId` and the
> "Add session" dialog calls the availability endpoint.
> B3 drops a page into the `app/(member)/` shell from **A4** — don't merge B3 until
> A4 is ✅ (check [`PROGRESS-A.md`](PROGRESS-A.md)).

## Decisions & deviations

_(none yet)_

## Notes for the next agent

- **Pagination pattern (required for list pages):** Follow the pattern established in A1/A2 — see `PROGRESS-A.md` Decisions section. Export a named `*_PAGE_SIZE = 25` constant from the hook, pass it as `limit` in URL params, use it for `totalPages` math and range text. Required for: **B0** (`instructors/page.tsx`) and **B3** (`app/(member)/bookings/page.tsx`). B1 sessions use date-range filtering (not page numbers) — different approach, no `PAGE_SIZE` needed there. B2 bookings roster is bounded per session — no pagination needed.
- **Inline form validation pattern (required for all forms):** use `mode: 'onTouched'` on `useForm`, add `noValidate` to the `<form>` element (prevents browser-native "Please enter a valid value" tooltip from firing on submit before Zod runs), and add `{ valueAsNumber: true }` to `form.register(...)` for every `type="number"` input. Without `valueAsNumber: true`, RHF passes the raw string to Zod and inline validation misfires on blur. Applies to: B0 instructor forms, B1 session capacity/times form, B2 bookings form. See `PROGRESS-A.md` Decisions section for the full pattern.
