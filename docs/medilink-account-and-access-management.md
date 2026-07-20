# MediLink Account & Access Management

Branch: `medilink-login-theme-redesign`

Adds a self-service account "Profile" page for every role, and reworks how
Institution Admins/Staff activate and deactivate accounts — from scattered
menu items and a brand-new crowded table column, down to one consistent
click-the-status-badge-and-confirm pattern.

## What changed, at a glance

| Area                                       | Before                                                                              | After                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account profile                            | No self-service profile of any kind for any role                                    | New `/profile` page + `Profile` sidebar/navbar entry for **every** role                                                                              |
| Staff/Professional activation (Users page) | "..." menu → Edit / Deactivate-Reactivate                                           | "..." menu → **Edit only**; status badge itself is now clickable                                                                                     |
| Patient activation                         | Didn't exist at all                                                                 | Status badge clickable (Institution Admin / Staff only; read-only for Professional)                                                                  |
| Confirmation                               | Deactivating a Staff/Professional happened instantly on menu click, no confirmation | Clicking any activation-capable status badge opens a confirm dialog ("Deactivate X? They'll no longer be able to log in...") before anything happens |

## Design decisions worth knowing

### Self-service Profile page

- New `/profile` page (`GET`/`PATCH /profile/me`, no `@Roles` restriction — self-scoped via `@CurrentUser()`) is deliberately narrower than the admin-facing user-update contract:

  | Role              | Can edit                  | Read-only                               |
  | ----------------- | ------------------------- | --------------------------------------- |
  | Super Admin       | Full name, Phone          | Email, Role, Institution                |
  | Institution Admin | Full name, Phone          | Email, Role, Institution                |
  | Staff             | Full name, Phone          | Email, Role, Institution                |
  | Professional      | Full name, Phone, **Bio** | Email, Role, Institution, **Specialty** |
  | Patient           | Full name, Phone          | Email, Role, Institution                |

  Email is never self-editable anywhere (it's the magic-link login identity; no update path exists for it even for admins today). Specialty stays admin-controlled for Professionals — it's a formal classification — while bio is the one field they write themselves, and it's exactly what patients see on the care-team profile view (`medilink-patient-record-views.md`).

- The "Save Changes" button is disabled until something actually differs from the loaded profile (compares `fullName`/`phone`/`bio` against the fetched values) — no submitting a no-op update.
- This page lives in the sidebar/navbar slot vacated by the removed Settings page (`medilink-dashboard-metrics.md`).

### Activation/deactivation redesign

- **First pass** added a Patient activate/deactivate endpoint (`PATCH /patients/:id/status`, `@Roles('INSTITUTION_ADMIN', 'STAFF')` — Patients had no status endpoint at all before this) plus a "Deactivate/Reactivate" button in its own table column. That column turned out to make an already-busy patients table more crowded.
- **Redesign**: removed the extra column/dropdown-item entirely. The status badge itself (`components/status-badge.tsx`, gained an optional `onClick`) is now the control on both the Users and Patients tables — click it, get a confirm dialog, confirm to proceed. Built as one shared component, `components/activation-status-badge.tsx`, so both pages behave identically instead of drifting.
- On the Users page, this left the "..." menu with only "Edit" in it — simplified to a plain pencil-icon button instead of a dropdown for a single item.
- Permission matrix, unchanged in spirit from before, just relocated: Institution Admin can toggle Staff, Professional, and Patient status; Staff can only toggle Patient status; Professional sees a plain, non-clickable badge (view-only).
- `PatientsService.setStatus` reuses the existing `userStatusRequestSchema`/`UserStatusRequest` contract from the Users module rather than duplicating an identical `{ isActive: boolean }` shape — a Patient's `isActive` lives on the same underlying `User` row.

## QA steps

1. As any role, open `/profile` (via the sidebar "Account" section or the navbar avatar dropdown) — confirm you see your own name/phone/email/role/institution.
2. Edit full name or phone, confirm "Save Changes" is disabled until you actually change something, then save and reload to confirm it persisted.
3. As a Professional, confirm Specialty is shown read-only ("set by your institution admin") but Bio is editable — edit it, save, then check it shows up on a patient's care-team "View Profile" dialog for that professional.
4. On `/users`, confirm the row menu only has "Edit" now (no Deactivate/Reactivate in it).
5. On `/users`, click a status badge — confirm dialog appears with role-appropriate wording ("staff member" vs "professional"), Cancel closes with no change, confirming toggles the badge and shows a toast.
6. On `/patients`, as Institution Admin or Staff, click a status badge — same confirm-dialog pattern, no separate Actions column.
7. On `/patients`, as a Professional, confirm the status badge is plain (not clickable, no confirm dialog) — Professionals shouldn't be able to change a patient's status.
8. Confirm clicking a status badge in either table does **not** also trigger the row's own click behavior (e.g. navigating to `/patients/:id`).

## Still missing / follow-up

- No bulk activate/deactivate — one row at a time only.
- No audit trail of who deactivated whom or when (matches the rest of the app — no audit log exists anywhere yet).
