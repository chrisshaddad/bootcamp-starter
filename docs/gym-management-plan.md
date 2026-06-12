# Gym Management System — Implementation Plan

> **Status:** For team review. Phase 0 (database) must be built and merged
> **first**. After that, Features A / B / C are independent and can be built in
> parallel — one owner each, each end-to-end (contracts → API → web).

## Context

We're building a multi-tenant **gym management system** on top of the existing
`bootcamp-starter` Turborepo. The starter already ships everything generic:
multi-tenant auth (orgs + roles), magic-link login, the
`@repo/contracts` → `apps/api` → `apps/web` data flow, an authenticated
dashboard shell, and shadcn UI primitives. Nothing gym-specific exists yet.

The natural mapping onto the existing multi-tenant model:

| Gym concept            | Starter concept                                  |
| ---------------------- | ------------------------------------------------ |
| A gym (its own data)   | `Organization` (already tenant-scoped)           |
| Gym manager/owner      | `User` with role `ORG_ADMIN`                     |
| Gym customer           | **new `Member` model** (no login — staff-managed)|

Key decisions:

- **Customers = separate `Member` records** (staff create/manage; customers don't log in).
- **Capacity tracker = both** gym-wide live occupancy AND per-session registration.
- **Plans = reusable catalog** per gym; subscriptions reference a plan.
- **Database-first, then parallel end-to-end features.** A **team of three**
  will build this together. To avoid migration conflicts and blocking each
  other, the **complete Prisma schema lands first as Phase 0** (one shared
  migration, merged before feature work). After that, each feature is an
  **independent end-to-end vertical slice** (contracts → API module → web UI)
  living in its own folders, so the three members can work in parallel with
  minimal merge surface.

Everything new is owned and managed by `ORG_ADMIN` for **their own gym only**.
Per `AGENTS.md`, **every Prisma query must filter by `organizationId`**, taken
from `@CurrentUser().organizationId`. The reference slice to mirror throughout
is the existing `organizations` feature (contracts → controller → service →
SWR hook → page).

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
  index every FK (`@@index([organizationId])`), cascade owned children. Edit
  `schema.prisma`, then `npx turbo run db:migrate -- --name <change>` (never
  hand-edit SQL; always pass `--name`).
- **API:** one folder per feature `src/<feature>/<feature>.{controller,service,module}.ts`,
  register module in `app.module.ts`. Validate bodies/queries with
  `ZodValidationPipe` (`src/common/pipes/`). DB access only via `PrismaService`.
  Guard with `@Roles('ORG_ADMIN')`, read tenant via `@CurrentUser()`. Use NestJS
  `Logger`, throw `NotFoundException`/`BadRequestException` — never `console.log`.
- **Web:** server components by default; `'use client'` only when needed. Pages
  under `app/(authenticated)/`. One SWR hook per resource in `hooks/`
  (mirror `hooks/use-organizations.ts`). API calls via `lib/api.ts`
  (`fetcher`, `apiPost`, `apiPatch`). Forms = `react-hook-form` +
  `zodResolver(<contract schema>)`. UI from `components/ui/` (shadcn — don't
  hand-edit; add new primitives via `npx shadcn@latest add`). Add nav entries to
  `components/app-sidebar.tsx` under a new `orgNavItems` set for `ORG_ADMIN`.
- **Price** stored as `Int` (minor units / cents) to avoid Prisma `Decimal`→JSON
  friction; formatted for display in the UI.

---

## Full schema (Phase 0 — all models land together)

Add these enums + models to `packages/database/prisma/schema.prisma`, plus the
`Organization` back-relations and `maxCapacity` listed below.

```prisma
enum MemberStatus        { ACTIVE INACTIVE                @@schema("public") }
enum SubscriptionStatus  { ACTIVE EXPIRED CANCELLED        @@schema("public") }
enum GymSessionStatus    { SCHEDULED CANCELLED COMPLETED   @@schema("public") }
enum BookingStatus       { BOOKED CHECKED_IN CANCELLED     @@schema("public") }

model Member {            // Feature A — gym customer (no login)
  id String @id @default(uuid())
  organizationId String
  name String
  email String?
  phoneNumber String?
  dateOfBirth DateTime?
  status MemberStatus @default(ACTIVE)
  joinedAt DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  subscriptions Subscription[]
  bookings SessionBooking[]
  checkIns CheckIn[]
  @@index([organizationId]) @@schema("public")
}

model MembershipPlan {    // Feature A — reusable plan catalog
  id String @id @default(uuid())
  organizationId String
  name String
  description String?
  durationDays Int
  price Int               // minor units (cents)
  isActive Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  subscriptions Subscription[]
  @@index([organizationId]) @@schema("public")
}

model Subscription {      // Feature A — a member's subscription period
  id String @id @default(uuid())
  organizationId String
  memberId String
  planId String?
  startDate DateTime
  endDate DateTime
  price Int               // snapshot of plan price at purchase
  status SubscriptionStatus @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member Member @relation(fields: [memberId], references: [id], onDelete: Cascade)
  plan MembershipPlan? @relation(fields: [planId], references: [id], onDelete: SetNull)
  @@index([organizationId]) @@index([memberId]) @@index([planId]) @@index([endDate]) @@schema("public")
}

model GymSession {        // Feature B — a scheduled class/session
  id String @id @default(uuid())
  organizationId String
  title String
  description String?
  instructor String?
  startsAt DateTime
  endsAt DateTime
  capacity Int
  status GymSessionStatus @default(SCHEDULED)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  bookings SessionBooking[]
  @@index([organizationId]) @@index([startsAt]) @@schema("public")
}

model SessionBooking {    // Feature B — member registered for a session
  id String @id @default(uuid())
  organizationId String
  sessionId String
  memberId String
  status BookingStatus @default(BOOKED)
  createdAt DateTime @default(now())
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  session GymSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  member Member @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@unique([sessionId, memberId])
  @@index([organizationId]) @@index([sessionId]) @@index([memberId]) @@schema("public")
}

model CheckIn {           // Feature C — gym-wide live occupancy
  id String @id @default(uuid())
  organizationId String
  memberId String
  checkedInAt DateTime @default(now())
  checkedOutAt DateTime?
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  member Member @relation(fields: [memberId], references: [id], onDelete: Cascade)
  @@index([organizationId]) @@index([memberId]) @@index([checkedInAt]) @@schema("public")
}
```

On `Organization`, add `maxCapacity Int?` (gym-wide building limit) and the
back-relations: `members Member[]`, `membershipPlans MembershipPlan[]`,
`subscriptions Subscription[]`, `gymSessions GymSession[]`,
`sessionBookings SessionBooking[]`, `checkIns CheckIn[]`.

---

## Phase 0 — Database foundation (do FIRST, merge before feature work)

**One person owns this; the whole team rebases on it before starting.** Land the
*entire* schema above in a single migration so no feature workstream ever needs
to touch `schema.prisma`.

- Add **all** enums and **all** models listed above to
  `packages/database/prisma/schema.prisma`.
- Add the `maxCapacity Int?` field and **all** back-relations to `Organization`.
- Migrate once: `npx turbo run db:migrate -- --name gym_schema`, then
  `npx turbo run db:generate`.
- **Seed data** (`packages/database/prisma/seeders/`): add `seedMembers`,
  `seedPlans`, `seedSubscriptions`, `seedSessions`, `seedBookings`,
  `seedCheckIns` (mirror `seedOrganizations.ts`), register them in
  `seeders/index.ts`, so every workstream has realistic per-gym data to build
  against. `console.*` is allowed in seeders.
- **Exit criteria:** `npx turbo run db:migrate` + `db:generate` + `db:seed`
  succeed; `@repo/db` exports the new model types. Merge to the shared branch.

> After Phase 0, the three features below are **independent and parallelizable**.
> Each owner builds their feature **end-to-end** (contracts → API module → web
> pages + hook + nav) entirely within their own folders. Shared files each owner
> appends one line to — `apps/api/src/app.module.ts`, `app-sidebar.tsx`,
> `packages/contracts/src/index.ts`, `seeders/index.ts` — are the only merge
> points and conflict trivially (one import/array entry each). Coordinate those
> small edits or resolve on merge.

---

## Feature A — Members + Plans + Subscriptions (Owner 1)

Gym customers, the plan catalog, and subscription period tracking
(start/end dates).

- **Contracts:** `members/` (`member.response.ts`, `member-list.response.ts`,
  `member-create.request.ts`, `member-update.request.ts`,
  `member-status.schema.ts`); `plans/` (response/list/create/update);
  `subscriptions/` (response/list; `subscription-create.request.ts` takes
  `memberId`, `planId`, `startDate` — API computes `endDate`, snapshots `price`).
- **API** (`apps/api/src/members`, `.../plans`, `.../subscriptions`):
  `MembersModule` (`GET /members?status=`, `GET /members/:id`, `POST /members`,
  `PATCH /members/:id`); `PlansModule` (`GET/POST/PATCH /plans`);
  `SubscriptionsModule` (`GET /members/:memberId/subscriptions`,
  `POST /subscriptions`, `PATCH /subscriptions/:id/cancel`). On subscription
  create, validate the plan belongs to the gym, compute
  `endDate = startDate + plan.durationDays`, snapshot `price`. **Every query
  filtered by `organizationId`** from `@CurrentUser()`; `findOne` uses
  `findFirst({ where: { id, organizationId } })`. `@Roles('ORG_ADMIN')`,
  `ZodValidationPipe`. Register the three modules in `app.module.ts`.
- **Web:** `members/page.tsx` (table + "Add member" dialog), `members/[id]/page.tsx`
  (detail + edit + a **Subscriptions** panel: history + "Add subscription" dialog
  showing computed end date), `plans/page.tsx` (manage catalog). Hooks
  `use-members.ts`, `use-plans.ts`, `use-subscriptions.ts` (mirror
  `use-organizations.ts`). Add **"Members"** and **"Plans"** nav items.
- **Verify:** create a member; create a plan; assign a subscription and confirm
  the end date is computed; cancel one; confirm a second gym's admin sees none of
  it (tenant isolation).

## Feature B — Sessions, Schedules + per-session capacity (Owner 2)

Scheduled classes, the schedule view, member registration, and the per-session
capacity tracker.

- **Contracts:** `sessions/` (response/list/create/update; create takes `title`,
  optional `description`/`instructor`, `startsAt`, `endsAt`, `capacity`; list &
  detail include `bookedCount` from Prisma `_count`); `bookings/`
  (booking response/list; `booking-create.request.ts` = `sessionId`, `memberId`).
- **API** (`apps/api/src/sessions`, `.../bookings`): `SessionsModule`
  (`GET /sessions` with date-range filter, `GET /sessions/:id`, `POST /sessions`,
  `PATCH /sessions/:id`, `PATCH /sessions/:id/cancel`; validate `endsAt > startsAt`);
  `BookingsModule` (`POST /bookings` — reject if full or duplicate via
  `BadRequestException`; `PATCH /bookings/:id/cancel`; `PATCH /bookings/:id/check-in`).
  Session reads include `_count.bookings`. Scoped by `organizationId`,
  `@Roles('ORG_ADMIN')`. Register modules in `app.module.ts`.
- **Web:** `sessions/page.tsx` (schedule grouped by day + "Add session" dialog),
  `sessions/[id]/page.tsx` (detail with a **capacity bar** `bookedCount/capacity`,
  "Register member" control, and roster with cancel/check-in). Hooks
  `use-sessions.ts`, `use-bookings.ts`. Add **"Schedule"** nav item.
- **Verify:** create sessions and see them ordered; book members up to capacity;
  confirm over-capacity and duplicate bookings are rejected; cancel frees a slot
  and the capacity bar updates.

## Feature C — Check-ins, live occupancy + Gym Dashboard (Owner 3)

Gym-wide live occupancy tracker plus the analytics dashboard. Reads across the
other features' tables but does **not** depend on their code — it queries the
shared schema directly, so it can be built in parallel (use seeded data).

- **Contracts:** `checkins/` (check-in response/list; create takes `memberId`);
  `dashboard/` (`dashboard-stats.response.ts`: `totalMembers`,
  `totalActiveMembers`, `expiringSoon` count+list, `currentOccupancy`,
  `maxCapacity`); a gym-settings update request for `maxCapacity`.
- **API** (`apps/api/src/checkins`, `.../dashboard`, gym settings): `CheckInsModule`
  (`POST /checkins`, `PATCH /checkins/:id/checkout`, `GET /checkins/active`);
  `DashboardModule` (`GET /dashboard/stats` — scoped aggregates: active members =
  distinct members with `Subscription status=ACTIVE AND endDate >= now`; expiring
  soon = subscriptions with `endDate` in [now, now+30d]; `currentOccupancy =
  count(CheckIn where checkedOutAt null)`; gym `maxCapacity`); a
  `PATCH /gym/settings` to set `maxCapacity`. Scoped by `organizationId`,
  `@Roles('ORG_ADMIN')`. Register modules in `app.module.ts`.
- **Web:** rebuild `app/(authenticated)/dashboard/page.tsx` with stat `Card`s —
  **Total active members**, **Expiring soon** (list/link), and a **Capacity
  Tracker** card (`currentOccupancy / maxCapacity` progress bar that warns near
  capacity); a **Check-in** screen `checkins/page.tsx` (currently-in members with
  check-out + "Check in member" control); set `maxCapacity` on `settings/page.tsx`.
  Hooks `use-dashboard.ts`, `use-checkins.ts`. Add **"Check-ins"** nav item.
- **Verify:** check members in/out and watch the live counter + dashboard
  occupancy update; confirm dashboard numbers match seeded data and the
  expiring-soon list is correct.

---

## Ownership & merge-point summary

| Feature | Owner | Own folders (no conflicts)                                    | Shared files (append 1 line)                          |
| ------- | ----- | ------------------------------------------------------------- | ----------------------------------------------------- |
| A       | TBD   | `members/`, `plans/`, `subscriptions/` (contracts + api + web) | `app.module.ts`, `app-sidebar.tsx`, `contracts/index.ts`, `seeders/index.ts` |
| B       | TBD   | `sessions/`, `bookings/` (contracts + api + web)              | same shared files                                     |
| C       | TBD   | `checkins/`, `dashboard/` (contracts + api + web)             | same shared files + `dashboard/page.tsx`, `settings/page.tsx` |

**Soft dependency:** Feature C's dashboard reads Feature A's subscriptions and
its own check-ins. The schema exists from Phase 0, so C builds against seeded
data in parallel; it can only be *fully* verified once A's data flows exist.

---

## End-to-end verification (each owner, before merging their feature)

1. `npm run services:init` (Docker: Postgres/Redis/Mailpit) + `npm install`.
2. Ensure Phase 0 is merged in: `npx turbo run db:generate` (+ `db:seed` for data).
3. After contract changes: `npx tsc -p packages/contracts`.
4. `npm run dev` → web :3000, api :3001. Log in via magic link (Mailpit :8025) as
   a seeded `ORG_ADMIN`, exercise the feature's UI, and confirm tenant isolation
   (a second gym's admin sees none of the first gym's data).
5. Pre-flight gates (CI parity): `npx turbo run lint`,
   `npx turbo run check-types`, `npm run format:check`.

## Branding (optional)

Update the sidebar logo text from "Bootcamp Starter" to the gym brand in
`app-sidebar.tsx`.

## Key reference files to mirror

- Contracts slice: `packages/contracts/src/organizations/*` + both `index.ts`.
- API slice: `apps/api/src/organizations/{controller,service,module}.ts`;
  auth decorators `apps/api/src/auth/decorators/`; `ZodValidationPipe` in
  `apps/api/src/common/pipes/`; `PrismaService` in `apps/api/src/database/`.
- Web slice: `apps/web/hooks/use-organizations.ts`,
  `apps/web/app/(authenticated)/organizations/{page,[id]/page}.tsx`,
  `apps/web/lib/api.ts`, `apps/web/components/app-sidebar.tsx`.
- Schema + seeders: `packages/database/prisma/schema.prisma`,
  `packages/database/prisma/seeders/seedOrganizations.ts`.
