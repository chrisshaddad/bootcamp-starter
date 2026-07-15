# MediLink — Flows 1–5 Implementation

This document describes the end-to-end implementation of the five core MediLink
user flows (backend + frontend) built on top of the remodeled schema (see
[`medilink-remodel.md`](./medilink-remodel.md)). It exists so teammates and AI
assistants can orient quickly without re-reading every file.

**No Prisma schema or migration changes were made** — the remodel already
modeled the full domain; this work adds the NestJS modules, shared contracts,
and Next.js UI that turn that schema into a working product.

## Roles recap

`SUPER_ADMIN` (platform, manages institutions) · `INSTITUTION_ADMIN` · `STAFF` ·
`PROFESSIONAL` · `PATIENT`. Every institution-scoped query is filtered by the
caller's `institutionId` (core principle: one deployment = one institution, no
cross-institution data). RBAC is enforced by NestJS guards (`@Roles`) plus
finer service-level checks; the frontend mirrors this with per-page role checks
(there is no `middleware.ts`, by design).

---

## Flow 1 — My Institution + role-aware dashboard

**Backend** (`apps/api/src/institutions/`)

| Method & path            | Roles                      | Notes                                                           |
| ------------------------ | -------------------------- | --------------------------------------------------------------- |
| `GET /institutions/me`   | Admin, Staff, Professional | Caller's own institution. Declared **before** `:id`.            |
| `PATCH /institutions/me` | Institution Admin          | Update name, type, address, phone, logoUrl, emailNotifications. |

Existing SUPER_ADMIN endpoints (`GET/POST /institutions`, approve/reject) are
unchanged.

**Frontend**

- `app/(authenticated)/institution/page.tsx` — view/edit institution profile.
- `app/(authenticated)/dashboard/page.tsx` — role-aware quick links + (for admins) an institution summary card.
- Hook: `hooks/use-my-institution.ts`.

---

## Flow 2 — User Management (Staff & Professionals)

**Backend** (`apps/api/src/users/`)

| Method & path             | Roles             | Notes                                                                                                                                              |
| ------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /users`              | Admin, Staff      | Admin sees all managed roles; **Staff is clamped to professionals only** (needed for care-team assignment). Filters: `role`, `isActive`, `search`. |
| `GET /users/:id`          | Institution Admin | Same institution or 404.                                                                                                                           |
| `POST /users`             | Institution Admin | Creates STAFF or PROFESSIONAL (+ `ProfessionalProfile` for professionals) in a transaction, then sends an invitation email. Email conflict → 409.  |
| `PATCH /users/:id`        | Institution Admin | Update fullName, phone, specialty/bio.                                                                                                             |
| `PATCH /users/:id/status` | Institution Admin | Deactivate / reactivate. Blocks changing your own status.                                                                                          |

**Frontend**

- `app/(authenticated)/users/page.tsx` — list, role filter, create dialog (specialty shown for professionals), edit + activate/deactivate.
- Hook: `hooks/use-users.ts`.

---

## Flow 3 — Patient Profile

**Backend** (`apps/api/src/patients/`)

| Method & path                  | Roles                                                 | Notes                                                                                                      |
| ------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `POST /patients`               | Admin, Staff                                          | Creates `User(role=PATIENT)` + `Patient` row in a transaction, sends invitation.                           |
| `GET /patients`                | Admin, Staff, Professional                            | Admin/Staff see all in institution; **Professional sees only actively-assigned patients** ("My Patients"). |
| `GET /patients/me`             | Patient                                               | The caller's own record (portal). Declared before `:id`.                                                   |
| `GET /patients/:id`            | Admin, Staff, Professional (assigned), Patient (self) | Returns admin + clinical layers + active care team.                                                        |
| `PATCH /patients/:id/admin`    | Admin, Staff                                          | Administrative layer (DOB, gender, nationalId, address, emergency contact) + user name/phone.              |
| `PATCH /patients/:id/clinical` | Admin, Professional (assigned)                        | Clinical summary (bloodType, allergies[], chronicConditions[], clinicalNotes).                             |

**Frontend**

- `app/(authenticated)/patients/page.tsx` — list + create dialog.
- `app/(authenticated)/patients/[id]/page.tsx` — detail composed of Administrative, Clinical, Care Team, and Records sections; edit-ability keyed off role.
- Section components in `components/patients/`.
- Hook: `hooks/use-patients.ts`.

---

## Flow 4 — Care Team Assignment

**Backend** (`apps/api/src/assignments/`)

| Method & path                       | Roles                                 | Notes                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /assignments`                 | Admin, Staff                          | Validates patient + professional belong to the institution; enforces one ACTIVE assignment per (patient, professional) via the `assignment_active_unique` partial index → 409 on duplicate; notifies the professional. |
| `GET /assignments?patientId=`       | Admin, Staff, Professional (assigned) | Active care team, enriched with professional info.                                                                                                                                                                     |
| `PATCH /assignments/:id/deactivate` | Admin, Staff                          | Soft removal (status → INACTIVE); history kept.                                                                                                                                                                        |

**Frontend**

- Care-team section inside the patient detail page: assign (professional picker from `GET /users?role=PROFESSIONAL`) and remove.
- Read-only care team also appears in the patient detail response + portal.
- Hook: `hooks/use-assignments.ts`.

---

## Flow 5 — Medical Records + Prescriptions + Files

**Backend** (`apps/api/src/medical-records/`, `apps/api/src/files/`)

| Method & path                             | Roles                                   | Notes                                                                                                                                                                                       |
| ----------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /patients/:patientId/records`       | Professional (assigned)                 | Body is a **zod discriminated union on `recordType`**; creates the record + matching detail row (+ Prescription/items) in a transaction; links the active assignment; notifies the patient. |
| `GET /patients/:patientId/records`        | Professional (assigned), Patient (self) | Summaries sorted by `recordDate desc`; optional `recordType` filter. Neither STAFF nor INSTITUTION_ADMIN can view clinical records.                                                         |
| `GET /records/:id`                        | Professional (assigned), Patient (self) | Full record + typed detail + attachments.                                                                                                                                                   |
| `POST /records/:id/files`                 | Professional (assigned)                 | `multipart/form-data` (`file`); stored on local disk; creates `RecordFile`.                                                                                                                 |
| `GET /records/:id/files/:fileId/download` | Professional (assigned), Patient (self) | Access-controlled stream (never a public static URL).                                                                                                                                       |

All five record types are supported: Lab Result, Consultation, Prescription
(with medication line items), Scan, Vaccination.

**File storage** — `files/file-storage.service.ts` writes to `apps/api/uploads/`
(git-ignored) behind a storage-agnostic interface (`saveFile` / `getFileStream`
/ `deleteFile`). **S3 swap point:** replace only the bodies of those methods; no
caller changes. Downloads go through an auth-guarded streaming endpoint so
clinical files respect patient-access rules.

**Frontend**

- Records section in the patient detail page: timeline list, add-record dialog (type-specific fields; prescriptions use a repeatable medication-line editor; optional attachment), and a record detail dialog with downloadable attachments + upload.
- Hook: `hooks/use-records.ts`.

---

## Supporting infrastructure

- **Invitations** — `AuthService.sendInvitation()` mints a magic link and queues the existing (previously unwired) `SEND_INVITATION` mail job. Called after creating any Staff / Professional / Patient. In dev, links appear in Mailpit (`:8025`).
- **Inactive-user gate** — `AuthGuard` now rejects deactivated accounts (deactivated users are logged out and cannot act).
- **Notifications (partial Flow 6)** — `NotificationsModule`: `NotificationsService.create()` emits system notifications (used by Assignments → professional, Records → patient); `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`. Frontend: navbar bell with unread badge + `app/(authenticated)/notifications/page.tsx`.
- **Shared frontend** — `components/forbidden-page.tsx` and `components/status-badge.tsx` (extracted from the two institutions pages, which now import them); `apiUpload()` in `lib/api.ts`; `components/app-sidebar.tsx` reworked to a `NAV_ITEMS_BY_ROLE` map covering all five roles.

---

## How to run / QA

```bash
npm run services:init        # postgres, redis, mailpit
npm install
npx turbo run db:generate db:deploy db:seed
npm run dev                  # web :3000, api :3001, mailpit :8025
```

Happy path (magic links appear in Mailpit `:8025`):

1. Super Admin (`admin@medilink.local`) → **Institutions** → create an institution with a new admin email → **Approve**.
2. Institution Admin logs in via the invite → edits **My Institution**, creates a **Staff** and a **Professional** under **Staff & Doctors**.
3. Staff logs in → **Patients** → registers a patient → fills the Administrative layer → assigns the Professional (Care Team).
4. Professional logs in → **My Patients** shows only the assigned patient → edits the Clinical Summary → adds a record of each type (incl. a multi-line prescription and a file attachment).
5. Patient logs in → **My Health** shows profile, care team, and records with downloadable files — all read-only.

Negative checks: professional cannot open a non-assigned patient (403); staff cannot edit clinical summary or add records; deactivated users cannot log in; duplicate active assignment → 409.

Verification status at implementation time:

- `npx turbo run check-types` — passes clean.
- `npx turbo run build` — passes clean (13 web routes generated).
- API unit specs — all 15 suites pass (`npx jest` in `apps/api`).

---

## Still missing / to be implemented

**Deliberate schema gaps (per the "follow the schema" decision)**

- Patient `registrationStatus` (in the spec M-05, not in the schema) — not built.
- **Discharge Summary** record type (spec M-07) — the `RecordType` enum has no `DISCHARGE` and there is no `DischargeDetail` table, so it is not built.

**Flow 6 — Notifications (only a minimal slice built)**

- Emission + list + mark-read + navbar bell exist. No email delivery of notifications, no pagination, no per-type icons/deep-links, and triggers are limited to "care team assignment" and "new record" (no lab-result-specific differentiation beyond the title).

**Flow 7 — Medical Timeline**

- No dedicated `GET /patients/:id/timeline` aggregation endpoint. The records list is per-patient over `MedicalRecord` only; a unified records-plus-prescriptions-plus-(future)appointments timeline is not built.

**Out of scope (unchanged from the feature spec)**

- Appointments (PA-01 / PA-02), professional availability, patient self-booking.
- Filtered record search (by date/type/uploader beyond the single `recordType` filter).
- Production email sending (Mailpit only in dev).
- Institution logo upload (the `logoUrl` field exists and is editable as a string, but there is no file-upload UI for it).
- i18n / RTL, audit log, admin statistics.

**Carried-over review backlog** (from `medilink-remodel.md`, still open)

- `institutions.service.ts` approve/reject/create do more DB round-trips than necessary.
- `use-institutions.ts` `invalidateAll()` double-fetches the detail endpoint.

**Fixed pre-existing broken tests**

- `apps/api/src/auth/auth.controller.spec.ts` and `auth.service.spec.ts` were failing NestJS dependency resolution (they didn't mock their providers) — the same defect the remodel had fixed for the institutions specs. They are now fixed here (providers mocked), so the full `apps/api` suite (15 suites) is green.
