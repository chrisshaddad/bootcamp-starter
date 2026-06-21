# Gym Management System — Implementation Plan

> **Status:** For team review. Phase 0 (database + `Gym` rename) must be built and
> merged **first**. After that, Features A / B / C run in **parallel — one owner
> each**, evenly split, each owning a domain end-to-end (admin + member-facing
> view). Within a feature, build the **internal phases in order**: build one
> vertical slice (contracts → API → web) → test it works → merge → next phase.

## Context

We're building a multi-tenant **gym management system** on top of the existing
`bootcamp-starter` Turborepo. The starter already ships everything generic:
multi-tenant auth (tenants + roles), magic-link login, the
`@repo/contracts` → `apps/api` → `apps/web` data flow, an authenticated
dashboard shell, and shadcn UI primitives. Nothing gym-specific exists yet.

We are **renaming the starter's generic `Organization` tenant to `Gym`** (model
`Organization`→`Gym`, `OrganizationStatus`→`GymStatus`, FK `organizationId`→
`gymId` everywhere). The domain is gyms, so the code should say so. Role names
(`SUPER_ADMIN`, `ORG_ADMIN`, `MEMBER`) are unchanged. This rename lands in Phase 0
(see below). The natural mapping onto the multi-tenant model:

| Gym concept          | Starter concept                                                         |
| -------------------- | ----------------------------------------------------------------------- |
| A gym (its own data) | `Gym` (renamed from `Organization`; tenant-scoped)                      |
| Gym manager/owner    | `User` with role `ORG_ADMIN`                                            |
| Gym customer         | **`Member` model**, optionally linked to a login `User` (role `MEMBER`) |

Key decisions:

- **Customers = `Member` records** (staff create/manage). After adding a member,
  the admin **always invites them to the member portal**: the invite provisions a
  linked `User` (role `MEMBER`, scoped to the gym) and sends a magic link.
  `Member.email` is required (not nullable) because the magic-link invite has no
  target without it. `Member.userId` is nullable at the DB level (null until the
  invite is sent) but portal access is not optional — every member is expected to
  be invited so they can track their own subscriptions, bookings, and browse plans.
- **Capacity tracker = both** gym-wide live occupancy AND per-session registration.
- **Plans = reusable catalog** per gym; subscriptions reference a plan.
- **Database-first, then parallel end-to-end features.** A **team of three**
  will build this together. To avoid migration conflicts and blocking each
  other, the **complete Prisma schema lands first as Phase 0** (one shared
  migration, merged before feature work). After that, each feature is an
  **independent end-to-end vertical slice** (contracts → API module → web UI)
  living in its own folders, so the three members can work in parallel with
  minimal merge surface.

Gym-management data is owned by `ORG_ADMIN` for **their own gym only**; logged-in
members see only **their own** records. Per `AGENTS.md`, **every Prisma query on a
tenant-scoped model must filter by `gymId`**, taken from `@CurrentUser().gymId`.
The reference slice to mirror throughout is the renamed `gyms` feature (was
`organizations`): contracts → controller → service → SWR hook → page.

---

## Conventions every feature follows (from AGENTS.md)

- **Schema is frozen after Phase 0.** Feature workstreams do **not** edit
  `schema.prisma` or create migrations — they build against the already-migrated
  models. (If a real gap is found, the schema owner makes one additive migration
  the whole team rebases on.)
- **Contracts first.** Every wire shape is a Zod schema in
  `packages/contracts/src/<resource>/`, one schema per file
  (`*-create.request.ts`, `*-list.response.ts`, `*.response.ts`), exporting both
  schema and inferred type. Update the folder `index.ts` **and**
  `packages/contracts/src/index.ts`, then rebuild: `npx tsc -p packages/contracts`.
- **Prisma (Phase 0 only):** UUID PKs, `createdAt`/`updatedAt`, `@@schema("public")`,
  index every FK (`@@index([gymId])`), cascade owned children. Edit
  `schema.prisma`, then `npx turbo run db:migrate -- --name <change>` (never
  hand-edit SQL; always pass `--name`).
- **API:** one folder per feature `src/<feature>/<feature>.{controller,service,module}.ts`,
  register module in `app.module.ts`. Validate bodies/queries with
  `ZodValidationPipe` (`src/common/pipes/`). DB access only via `PrismaService`.
  Guard with `@Roles('ORG_ADMIN')` (or `@Roles('MEMBER')` for the member portal),
  read tenant via `@CurrentUser().gymId`. Use NestJS `Logger`, throw
  `NotFoundException`/`BadRequestException` — never `console.log`.
- **Swagger (required on every controller/endpoint):** docs are served at
  `http://localhost:3001/docs`. Every controller must have `@ApiTags('resource-name')`
  (matching the tag in `main.ts`) and `@ApiCookieAuth('session-cookie')`. Every
  route handler must have `@ApiOperation({ summary })`, `@ApiResponse` for every
  possible status code (200/201 success, 400 validation, 401 unauthenticated,
  403 wrong role, 404 not found), `@ApiParam` for each path param, `@ApiQuery`
  for each query param, and `@ApiBody({ schema: { ... } })` for request bodies
  (describe shape as inline JSON schema — bodies are Zod-validated, not class-based,
  so describe them manually). See the Swagger section in `AGENTS.md` for the full
  decorator table and example. A phase is **not done** if its endpoints are missing
  Swagger decorators.
- **Web:** server components by default; `'use client'` only when needed. Pages
  under `app/(authenticated)/`. One SWR hook per resource in `hooks/`
  (mirror `hooks/use-gyms.ts`). API calls via `lib/api.ts`
  (`fetcher`, `apiPost`, `apiPatch`). Forms = `react-hook-form` +
  `zodResolver(<contract schema>)`. UI from `components/ui/` (shadcn — don't
  hand-edit; add new primitives via `npx shadcn@latest add`). Add nav entries to
  `components/app-sidebar.tsx` under a new `orgNavItems` set for `ORG_ADMIN`.
- **Price** stored as `Int` (minor units / cents) to avoid Prisma `Decimal`→JSON
  friction; formatted for display in the UI.

---

## Full schema (Phase 0 — all models land together)

Add these enums + models to `packages/database/prisma/schema.prisma`, plus the
`Gym` back-relations and `maxCapacity` listed below.

```prisma
enum MemberStatus        { ACTIVE INACTIVE                @@schema("public") }
enum SubscriptionStatus  { ACTIVE EXPIRED CANCELLED        @@schema("public") }
enum GymSessionStatus    { SCHEDULED CANCELLED COMPLETED   @@schema("public") }
enum BookingStatus       { BOOKED CHECKED_IN CANCELLED     @@schema("public") }

model Member {            // Feature A — gym customer (always invited to the member portal)
  id String @id @default(uuid())
  gymId String
  userId String? @unique  // linked login account (null until invite is sent; role MEMBER)
  name String
  email String            // required — used for magic-link portal invite
  phoneNumber String?
  dateOfBirth DateTime?
  status MemberStatus @default(ACTIVE)
  joinedAt DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  gym Gym @relation(fields: [gymId], references: [id], onDelete: Cascade)
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  subscriptions Subscription[]
  bookings SessionBooking[]
  checkIns CheckIn[]
  @@index([gymId]) @@index([userId]) @@schema("public")
}

model MembershipPlan {    // Feature A — reusable plan catalog
  id String @id @default(uuid())
  gymId String
  name String
  description String?
  durationDays Int
  price Int               // minor units (cents)
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  gym Gym @relation(fields: [gymId], references: [id], onDelete: Cascade)
  subscriptions Subscription[]
  @@index([gymId]) @@schema("public")
}

model Subscription {      // Feature A — a member's subscription period
  id String @id @default(uuid())
  gymId String
  memberId String
  planId String?
  startDate DateTime
  endDate DateTime
  price Int               // snapshot of plan price at purchase
  status SubscriptionStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  gym Gym @relation(fields: [gymId], references: [id], onDelete: Cascade)
  member Member @relation(fields: [memberId], references: [id], onDelete: Cascade)
  plan MembershipPlan? @relation(fields: [planId], references: [id], onDelete: SetNull)
  @@index([gymId]) @@index([memberId]) @@index([planId]) @@index([endDate]) @@schema("public")
}

model Instructor {         // Feature B — gym instructor/trainer
  id String @id @default(uuid())
  gymId String
  name String
  email String?
  specialization String?
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  gym Gym @relation(fields: [gymId], references: [id], onDelete: Cascade)
  gymSessions GymSession[]
  @@index([gymId]) @@schema("public")
}

model GymSession {        // Feature B — a scheduled class/session
  id String @id @default(uuid())
  gymId String
  title String
  description String?
  instructorId String?    // nullable — session can be unassigned; SetNull on instructor delete
  startsAt DateTime
  endsAt DateTime
  capacity Int
  status GymSessionStatus @default(SCHEDULED)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  gym Gym @relation(fields: [gymId], references: [id], onDelete: Cascade)
  instructor Instructor? @relation(fields: [instructorId], references: [id], onDelete: SetNull)
  bookings SessionBooking[]
  @@index([gymId]) @@index([startsAt]) @@index([instructorId]) @@schema("public")
}

model SessionBooking {    // Feature B — member registered for a session
  id String @id @default(uuid())
  gymId String
  sessionId String
  memberId String
  status BookingStatus @default(BOOKED)
  createdAt DateTime @default(now())
  gym Gym @relation(fields: [gymId], references: [id], onDelete: Cascade)
  session GymSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  member Member @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@unique([sessionId, memberId])
  @@index([gymId]) @@index([sessionId]) @@index([memberId]) @@schema("public")
}

model CheckIn {           // Feature C — gym-wide live occupancy
  id String @id @default(uuid())
  gymId String
  memberId String
  checkedInAt DateTime @default(now())
  checkedOutAt DateTime?
  gym Gym @relation(fields: [gymId], references: [id], onDelete: Cascade)
  member Member @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@index([gymId]) @@index([memberId]) @@index([checkedInAt]) @@schema("public")
}
```

On the renamed `Gym` model (was `Organization`), add `maxCapacity Int?` (gym-wide
building limit) and the back-relations: `members Member[]`,
`membershipPlans MembershipPlan[]`, `subscriptions Subscription[]`,
`instructors Instructor[]`, `gymSessions GymSession[]`,
`sessionBookings SessionBooking[]`, `checkIns CheckIn[]`. On `User`, add the
back-relation `member Member?` (a member's optional login account).
`User.organizationId` is renamed to `User.gymId` as part of the Phase 0 rename.

---

## Phase 0 — Database foundation (do FIRST, merge before feature work)

**One person owns this; the whole team rebases on it before starting.** Land the
rename _and_ the _entire_ schema above in a single migration so no feature
workstream ever needs to touch `schema.prisma`.

- **Rename `Organization` → `Gym`** (do this first, in the same migration): model
  `Organization`→`Gym`, enum `OrganizationStatus`→`GymStatus`, and the FK
  `organizationId`→`gymId` everywhere it appears — `User.gymId`, all relations,
  and `@@index`. This also propagates to the existing starter slices that are
  renamed `organizations`→`gyms`: contracts (`packages/contracts/src/organizations`
  → `gyms`), API module (`apps/api/src/organizations` → `gyms`), web pages
  (`apps/web/app/(authenticated)/organizations` → `gyms`) and hook
  (`use-organizations.ts` → `use-gyms.ts`), plus `@CurrentUser().organizationId`
  → `.gymId` in auth. Mechanical but touches the starter core — it lands with
  Phase 0 and is frozen afterward. (Role names `SUPER_ADMIN`/`ORG_ADMIN`/`MEMBER`
  do **not** change.)
- Add **all** enums and **all** models listed above to
  `packages/database/prisma/schema.prisma`.
- Add the `maxCapacity Int?` field and **all** back-relations to `Gym`, add
  `Member.userId` (`@unique`) + the `Member.user` relation, and the `User.member`
  back-relation (member login link).
- Migrate once: `npx turbo run db:migrate -- --name gym_rename_and_schema`, then
  `npx turbo run db:generate`.
- **Seed data** (`packages/database/prisma/seeders/`): rename
  `seedOrganizations.ts` → `seedGyms.ts`; add `seedInstructors`, `seedMembers`,
  `seedPlans`, `seedSubscriptions`, `seedSessions`, `seedBookings`, `seedCheckIns`
  (mirror `seedGyms.ts`), register them in `seeders/index.ts`. Seed instructors
  first (before sessions) since sessions reference `instructorId`. Give some seeded
  members a linked `User` (role `MEMBER`, scoped to the gym) so member login is
  testable end-to-end. `console.*` is allowed in seeders.
- **Exit criteria:** `npx turbo run db:migrate` + `db:generate` + `db:seed`
  succeed; the renamed `gyms` slice type-checks; `@repo/db` exports the new model
  types. Merge to the shared branch.

> After Phase 0, the three features below are **independent and parallelizable** —
> one owner each (work is split evenly; see the ownership table). Each owner owns
> one domain **end-to-end, including its member-facing portal view** (the old
> "Feature D" member portal is distributed by domain across A/B/C, so no one is
> overloaded).
>
> **Build each feature phase-by-phase, not in one shot.** Every feature below is
> broken into **internal phases**, and each phase is a complete **vertical slice**
> (contracts → API → web) for one sub-resource. The rule per phase: **build →
> test it works end-to-end → merge → move to the next phase.** Don't start a
> phase until the previous one is green. Related pieces are grouped into the same
> phase where it helps (e.g. bookings + the per-session capacity check ship
> together, since capacity is meaningless without bookings).
>
> Shared files each owner appends to — `apps/api/src/app.module.ts`,
> `app-sidebar.tsx`, `packages/contracts/src/index.ts`, `seeders/index.ts`, the
> `app/(member)/` portal shell, and `proxy.ts` — are the only merge points and
> conflict trivially. The portal shell + role redirect are built once in **Phase
> A4** (Owner 1) as a small foundation the other owners drop their member page
> into; coordinate that and resolve on merge.

---

## Feature A — Members + Plans + Subscriptions (Owner 1)

Gym customers, the plan catalog, subscription period tracking, plus the member
portal foundation. Build the five phases **in order** — each is build → test →
merge before the next.

**Phase A0 — Gym self-registration (public form + approval flow).**

- _Contracts:_ `gyms/gym-register.request.ts` — `name` (required), `ownerName`
  (required), `email` (required), `description` (optional), `website` (optional).
  Export schema + type; update `gyms/index.ts` and `packages/contracts/src/index.ts`.
- _API:_ on `GymsModule`, add **`POST /gyms/register`** decorated with `@Public()`
  (unauthenticated). In a single transaction: create a `User` (`role: ORG_ADMIN`,
  `isConfirmed: false`), create a `Gym` (`status: PENDING`, `createdById: user.id`),
  update `user.gymId = gym.id`. Queue a magic-link email to the owner so they can
  log in once approved. Return `201` with `{ message, gymId }`. Use
  `BadRequestException` if the email is already taken.
- _Web:_ `app/register/page.tsx` — public page (outside the authenticated shell),
  a simple form with gym name, owner name, email, optional description + website.
  On success show a confirmation message ("Your registration is pending approval").
  Add a "Register your gym" link on the login page.
- _Test:_ submit the form → gym appears in the SUPER_ADMIN `/gyms` list with status
  PENDING → SUPER_ADMIN approves → gym status flips to ACTIVE and the owner can log
  in via magic link. Confirm duplicate email is rejected. **Green before A1.**

**Phase A1 — Members (admin CRUD).**

- _Contracts:_ `members/` (`member.response.ts`, `member-list.response.ts`,
  `member-create.request.ts`, `member-update.request.ts`,
  `member-status.schema.ts`). `member-create.request.ts` must include `email` as a
  required field (not optional) — it is needed for the portal invite in A4.
- _API:_ `MembersModule` (`GET /members?status=`, `GET /members/:id`,
  `POST /members`, `PATCH /members/:id`). **Every query filtered by `gymId`** from
  `@CurrentUser()`; `findOne` uses `findFirst({ where: { id, gymId } })`.
  `@Roles('ORG_ADMIN')`, `ZodValidationPipe`. Register in `app.module.ts`.
- _Web:_ `members/page.tsx` (table + "Add member" dialog), `members/[id]/page.tsx`
  (detail + edit). Hook `use-members.ts` (mirror `use-gyms.ts`). Add **"Members"**
  nav item.
- _Test:_ create / list / filter / edit a member; confirm a second gym's admin
  sees none of it (tenant isolation). **Green before A2.**

**Phase A2 — Plans (admin catalog).**

- _Contracts:_ `plans/` (response / list / create / update).
- _API:_ `PlansModule` (`GET/POST/PATCH /plans`), scoped by `gymId`.
- _Web:_ `plans/page.tsx` (manage catalog). Hook `use-plans.ts`. Add **"Plans"**
  nav item.
- _Test:_ create / edit / deactivate a plan; prices display correctly (cents →
  formatted). **Green before A3.**

**Phase A3 — Subscriptions.**

- _Contracts:_ `subscriptions/` (response / list; `subscription-create.request.ts`
  takes `memberId`, `planId`, `startDate` — API computes `endDate`, snapshots
  `price`).
- _API:_ `SubscriptionsModule` (`GET /members/:memberId/subscriptions`,
  `POST /subscriptions`, `PATCH /subscriptions/:id/cancel`). On create, validate
  the plan belongs to the gym, compute `endDate = startDate + plan.durationDays`,
  snapshot `price`. Scoped by `gymId`.
- _Web:_ a **Subscriptions** panel on `members/[id]/page.tsx` (history + "Add
  subscription" dialog showing the computed end date). Hook `use-subscriptions.ts`.
- _Test:_ assign a subscription, confirm the end date is computed and price
  snapshotted; cancel one. **Green before A4.**

**Phase A4 — Member invite + portal foundation (member login).** _(This is the
distributed member-portal slice for A, and the shared shell other features build
on — see B3 / C3.)_

- _Contracts:_ `me/` (`me-overview.response.ts`: member profile + active
  subscription summary; reuse subscription/plan response schemas for the lists).
- _API:_ on `MembersModule`, add **`POST /members/:id/invite`** — provisions a
  `User` (role `MEMBER`, same `gymId`) for the member's `email`, links
  `Member.userId`, queues a magic link via the existing mail queue (requires
  `email`, rejects if already invited). New `MePortalModule` (`@Roles('MEMBER')`)
  resolving the caller via
  `prisma.member.findFirst({ where: { userId: user.id, gymId } })`:
  `GET /me/profile`, `GET /me/subscriptions`, `GET /me/plans` (active catalog).
- _Web:_ add an **"Invite to portal"** action on `members/[id]/page.tsx`. Build
  the **`app/(member)/` route group** (layout + member sidebar, role-gated to
  `MEMBER`), the **role-aware redirect** in `proxy.ts` (`MEMBER` → portal home,
  `ORG_ADMIN`/`SUPER_ADMIN` → `/dashboard`), and member pages: portal **home**,
  **"My subscriptions"**, **"Available plans"**, profile. Hook `use-me.ts`.
- _Test:_ invite a member → magic link arrives (Mailpit :8025) → member logs in,
  lands on the portal, sees only their own subscriptions + the active plans, and
  **cannot** reach admin routes or another gym's data.

## Feature B — Instructors + Sessions, Schedules + per-session capacity (Owner 2)

Instructor management, scheduled classes, the schedule view, member registration,
the per-session capacity tracker, and the member's "My bookings" portal view.
Build in order — B0 must be done before B1 since sessions reference instructors.

**Phase B0 — Instructors (admin CRUD + availability).**

- _Contracts:_ `instructors/` (`instructor.response.ts`, `instructor-list.response.ts`,
  `instructor-create.request.ts` — `name` required, `email`/`specialization` optional;
  `instructor-update.request.ts`).
- _API:_ `InstructorsModule` (`GET /instructors`, `GET /instructors/:id`,
  `POST /instructors`, `PATCH /instructors/:id`). Add **`GET /instructors/available`**
  with query params `startsAt` and `endsAt` — returns instructors who have **no**
  existing session where `session.startsAt < endsAt AND session.endsAt > startsAt`
  (overlap detection). Also filter `isActive: true` on the instructor and exclude
  sessions with status `CANCELLED` from the overlap check — a cancelled session
  must not block the slot. Scoped by `gymId`, `@Roles('ORG_ADMIN')`.
  Register in `app.module.ts`.
- _Web:_ `instructors/page.tsx` (list + "Add instructor" dialog + deactivate).
  Hook `use-instructors.ts`. Add **"Instructors"** nav item (above "Schedule").
- _Test:_ create instructors; deactivate one; confirm `GET /instructors/available`
  excludes inactive instructors and instructors with overlapping non-cancelled sessions. **Green before B1.**

**Phase B1 — Sessions (admin schedule).**

- _Contracts:_ `sessions/` (response / list / create / update; create takes
  `title`, optional `description`, `instructorId` (optional FK), `startsAt`,
  `endsAt`, `capacity`; list & detail include `bookedCount` from Prisma `_count`
  and the nested `instructor` object).
- _API:_ `SessionsModule` (`GET /sessions` with date-range filter,
  `GET /sessions/:id`, `POST /sessions`, `PATCH /sessions/:id`,
  `PATCH /sessions/:id/cancel`; validate `endsAt > startsAt`; if `instructorId`
  provided, verify it belongs to the gym). Reads include `_count.bookings` and
  `instructor`. Scoped by `gymId`, `@Roles('ORG_ADMIN')`.
- _Web:_ `sessions/page.tsx` (schedule grouped by day + "Add session" dialog —
  instructor field calls `GET /instructors/available?startsAt=&endsAt=` once both
  times are set and shows a dropdown of available instructors only),
  `sessions/[id]/page.tsx` (detail with instructor name + capacity bar shows
  `0/capacity` for now). Hook `use-sessions.ts`. Add **"Schedule"** nav item.
- _Test:_ create sessions with and without an instructor; confirm the availability
  dropdown excludes busy instructors; `endsAt > startsAt` enforced; cancel a
  session. **Green before B2.**

**Phase B2 — Bookings + per-session capacity.** _(Grouped: capacity enforcement is
only meaningful alongside bookings, so they ship together.)_

- _Contracts:_ `bookings/` (booking response / list;
  `booking-create.request.ts` = `sessionId`, `memberId`).
- _API:_ `BookingsModule` (`POST /bookings` — reject if **full or duplicate** via
  `BadRequestException`; `PATCH /bookings/:id/cancel`;
  `PATCH /bookings/:id/check-in`). Scoped by `gymId`.
- _Web:_ on `sessions/[id]/page.tsx`, wire the **capacity bar**
  (`bookedCount/capacity`), the "Register member" control, and the roster with
  cancel / check-in. Hook `use-bookings.ts`.
- _Test:_ book members up to capacity; confirm over-capacity and duplicate
  bookings are rejected; cancel frees a slot and the bar updates. **Green before
  B3.**

**Phase B3 — Member "My bookings" view (portal).** _(Distributed member-portal
slice for B; drops into the `app/(member)/` shell from A4.)_

- _API:_ on `MePortalModule`, add `GET /me/bookings` (caller's own bookings,
  scoped to their `member.id` + `gymId`).
- _Web:_ a **"My bookings"** page in the `app/(member)/` portal listing the
  member's upcoming/past sessions. Extend `use-me.ts` (or `use-my-bookings.ts`).
- _Test:_ a logged-in member sees only their own bookings; another gym's data
  never appears.

## Feature C — Check-ins, live occupancy + Gym Dashboard (Owner 3)

Gym-wide live occupancy, the analytics dashboard, and the QR-code check-in flow
(both the admin's rotating QR and the member's scan). Reads across the other
features' tables but does **not** depend on their code — it queries the shared
schema directly (use seeded data, including a seeded linked `User` for C3). Build
in order.

**Phase C1 — Check-ins (manual) + live occupancy.**

- _Contracts:_ `checkins/` (check-in response / list; manual create takes
  `memberId`).
- _API:_ `CheckInsModule` (`POST /checkins` — **manual admin check-in** by
  `memberId`, kept as the fallback path; `PATCH /checkins/:id/checkout`;
  `GET /checkins/active`). Scoped by `gymId`, `@Roles('ORG_ADMIN')`.
- _Web:_ `checkins/page.tsx` (currently-in members with check-out + manual "Check
  in member" control). Hook `use-checkins.ts`. Add **"Check-ins"** nav item.
- _Test:_ check members in / out manually and watch the active-occupancy count
  move. **Green before C2.**

**Phase C2 — Dashboard + gym settings.**

- _Contracts:_ `dashboard/` (`dashboard-stats.response.ts`: `totalMembers`,
  `totalActiveMembers`, `expiringSoon` count+list, `currentOccupancy`,
  `maxCapacity`); a gym-settings update request for `maxCapacity`.
- _API:_ `DashboardModule` (`GET /dashboard/stats` — scoped aggregates: active
  members = distinct members with `Subscription status=ACTIVE AND endDate >= now`;
  expiring soon = subscriptions with `endDate` in [now, now+30d];
  `currentOccupancy = count(CheckIn where checkedOutAt null)`; gym `maxCapacity`);
  `PATCH /gym/settings` to set `maxCapacity`. Scoped by `gymId`.
- _Web:_ rebuild `app/(authenticated)/dashboard/page.tsx` with stat `Card`s —
  **Total active members**, **Expiring soon** (list/link), and a **Capacity
  Tracker** card (`currentOccupancy / maxCapacity` progress bar that warns near
  capacity); set `maxCapacity` on `settings/page.tsx`. Hook `use-dashboard.ts`.
- _Test:_ dashboard numbers match seeded data; expiring-soon list is correct;
  setting `maxCapacity` updates the tracker. **Green before C3.**

**Phase C3 — QR check-in (admin issues, member scans).** _(Spans the admin side
here and the member side; drops the member `checkin` page into the `app/(member)/`
shell from A4. Coordinate the token contract + Redis key format with Owner 1.)_

- _Contracts:_ `checkins/checkin-qr-token.response.ts` = `{ token, expiresAt }`
  (admin display); `me/checkin-scan.request.ts` = `{ token }` (member scan).
- _API:_ on `CheckInsModule`, add **`GET /checkins/qr-token`** — issues a
  **rotating short-lived token** for the gym, stored in **Redis** keyed by `gymId`
  with a ~30-60s TTL (a screenshot can't be reused later; no DB model, so Phase 0
  stays frozen). On `MePortalModule` (from A4), add **`POST /me/checkins`** — body
  `{ token }`: validate against Redis (exists, not expired, resolves to the
  **caller's own `gymId`**), then create a `CheckIn` for the caller's `member.id`
  (reject a duplicate open check-in). Never trust a client-supplied member id.
- _Web:_ admin **"Check-in QR"** screen `checkins/qr/page.tsx` that polls
  `GET /checkins/qr-token` and renders the token as a QR encoding
  `${APP_URL}/checkin?token=<token>` (use a QR generator such as `qrcode`;
  auto-refresh before each expiry). Member **`app/(member)/checkin/page.tsx`**
  landing route: reads `?token=`, `POST`s `/me/checkins`, shows success / "QR
  expired, ask staff to refresh". Member scans with their **phone's native camera**
  (no in-app scanner); if not logged in, `proxy.ts` routes them through magic-link
  login and back.
- _Test:_ open the admin QR screen and confirm it rotates; scan with a phone (or
  paste the encoded URL) and confirm a check-in is recorded for that member and
  live occupancy increments; confirm an expired/forged token is rejected and a
  member can't check into another gym.

---

## Ownership & merge-point summary

Three owners, **one feature each, built end-to-end** (admin + member-facing view).
Within a feature, build the internal phases **in order** (build → test → merge →
next).

| Feature | Owner | Internal phases (build in order)                                                           | Own folders                                                                                                                           | Shared files (append)                                                                    |
| ------- | ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **A**   | 1     | A0 Gym registration · A1 Members · A2 Plans · A3 Subscriptions · A4 Invite + portal shell  | `gyms/gym-register.request.ts`, `members/`, `plans/`, `subscriptions/`, `me/` (contracts+api), `app/(member)/` shell, `app/register/` | `app.module.ts`, `app-sidebar.tsx`, `contracts/index.ts`, `seeders/index.ts`, `proxy.ts` |
| **B**   | 2     | B0 Instructors + availability · B1 Sessions · B2 Bookings + capacity · B3 My-bookings view | `instructors/`, `sessions/`, `bookings/` (contracts+api+web) + `me/bookings` + portal "My bookings" page                              | same shared files                                                                        |
| **C**   | 3     | C1 Check-ins · C2 Dashboard + settings · C3 QR check-in                                    | `checkins/`, `dashboard/` (contracts+api+web) + portal `checkin` page                                                                 | same shared files + `dashboard/page.tsx`, `settings/page.tsx`                            |

**Balanced ≈ 3 ÷ 3:** each owner ships ~3 admin/back-end slices **plus** the
member-facing view for their own domain. The shared **`app/(member)/` portal shell
and role redirect is built once in A4** by Owner 1; Owners 2 and 3 add their single
portal page (B3 / C3) into it.

**Phase 0 rename** is a one-time foundation step owned by the schema owner
(`Organization`→`Gym`, `organizationId`→`gymId`); the whole team rebases on it
before feature work begins.

**Cross-feature ordering & soft dependencies:**

- A1 is the root — B's bookings and C's check-ins both reference members, so **A1
  lands before B2/C1 can be fully tested** (build against seeded members until
  then).
- **B0 (Instructors) must be done before B1 (Sessions)** — sessions reference
  `instructorId` and the "Add session" dialog calls the availability endpoint.
- B3 and C3 (the member portal pages) depend on the **A4 portal shell**, so A4
  lands before they merge.
- **QR check-in (C3)** uses A4's `MePortalModule`. Owners 1 and 3 share the token
  contract (`checkin-qr-token.response.ts` / `checkin-scan.request.ts`) and the
  **Redis key format** for the gym's current token — agree on both up front.

---

## End-to-end verification (each owner, before merging their feature)

1. `npm run services:init` (Docker: Postgres/Redis/Mailpit) + `npm install`.
2. Ensure Phase 0 is merged in: `npx turbo run db:generate` (+ `db:seed` for data).
3. After contract changes: `npx tsc -p packages/contracts`.
4. `npm run dev` → web :3000, api :3001. Log in via magic link (Mailpit :8025) as
   a seeded `ORG_ADMIN`, exercise the phase's UI, and confirm tenant isolation
   (a second gym's admin sees none of the first gym's data). Run this **after each
   internal phase**, not just at the end. For the member-portal phases (A4 / B3 /
   C3), also log in as a seeded/invited `MEMBER` and confirm the portal shows only
   their own data, the active plans catalog, and (C3) the QR scan check-in.
5. Pre-flight gates (CI parity): `npx turbo run lint`,
   `npx turbo run check-types`, `npm run format:check`.

## Branding (optional)

Update the sidebar logo text from "Bootcamp Starter" to the gym brand in
`app-sidebar.tsx`.

## Key reference files to mirror

> Paths below use the post-rename names. Before Phase 0 they still exist under
> `organizations`; the rename (Phase 0) moves them to `gyms`.

- Contracts slice: `packages/contracts/src/gyms/*` + both `index.ts`.
- API slice: `apps/api/src/gyms/{controller,service,module}.ts`;
  auth decorators `apps/api/src/auth/decorators/`; `ZodValidationPipe` in
  `apps/api/src/common/pipes/`; `PrismaService` in `apps/api/src/database/`.
  Member-invite mail pattern: `apps/api/src/auth/auth.service.ts` +
  `apps/api/src/mail/` (queue → processor).
- Web slice: `apps/web/hooks/use-gyms.ts`,
  `apps/web/app/(authenticated)/gyms/{page,[id]/page}.tsx`,
  `apps/web/lib/api.ts`, `apps/web/components/app-sidebar.tsx`.
- Schema + seeders: `packages/database/prisma/schema.prisma`,
  `packages/database/prisma/seeders/seedGyms.ts`.
