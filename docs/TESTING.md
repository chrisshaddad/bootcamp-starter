# How to Test the Gym Management System

> This guide covers how to start the project, verify everything is working,
> and run the pre-flight quality gates before opening a PR. Read top to bottom
> the first time; after that jump to the section you need.

---

## 1. Prerequisites

| Requirement | Version | Check with      |
| ----------- | ------- | --------------- |
| Node        | ≥ 20    | `node -v`       |
| npm         | ≥ 9     | `npm -v`        |
| Docker      | ≥ 20    | `docker info`   |
| Git         | any     | `git --version` |

---

## 2. First-time setup (do once)

```bash
# 1. Copy environment files
cp apps/api/.env.example   apps/api/.env
cp apps/web/.env.example   apps/web/.env
cp packages/database/.env.example packages/database/.env

# 2. Start Docker services (Postgres :5433, Redis :6380, Mailpit :8025)
npm run services:init

# 3. Install npm dependencies
npm install

# 4. Run the initial migration (creates all tables)
npx turbo run db:migrate -- --name init

# 5. Generate Prisma client
npx turbo run db:generate

# 6. Seed with test data
npx turbo run db:seed
```

---

## 3. Start the dev servers

```bash
npm run dev
```

| Service | URL                        | Description           |
| ------- | -------------------------- | --------------------- |
| Web     | http://localhost:3000      | Next.js frontend      |
| API     | http://localhost:3001      | NestJS REST API       |
| Docs    | http://localhost:3001/docs | Swagger / OpenAPI     |
| Mail    | http://localhost:8025      | Mailpit (magic links) |

---

## 4. Pre-flight quality gates (run before every PR)

```bash
# Type-check all packages
npx turbo run check-types

# Lint all packages
npx turbo run lint

# Format check (must match Prettier config)
npm run format:check
```

All three must pass with **zero errors** before opening a PR.

---

## 5. How magic-link login works

1. Navigate to http://localhost:3000/login.
2. Enter a seeded email (see the seeder files under `packages/database/prisma/seeders/`).
3. Click **Send magic link**.
4. Open http://localhost:8025 (Mailpit) and click the link in the email.
5. You are logged in and redirected to your dashboard.

> The seed script creates at least one `SUPER_ADMIN`, one `ORG_ADMIN`, and
> one `MEMBER` user — check `seeders/index.ts` for exact emails.

---

## 6. Tenant isolation test

1. Register two gyms (or use two seeded gyms).
2. Log in as `ORG_ADMIN` of Gym A → create a member, an instructor, a plan.
3. Log out → log in as `ORG_ADMIN` of Gym B.
4. **Confirm Gym B sees zero records from Gym A** on every list page.

This is the most important manual test — cross-tenant leakage is the #1
security bug in multi-tenant SaaS.

---

## 7. Feature B — Phase B0 test checklist (Instructors)

Run this after `npm run dev` is up.

### API smoke test via Swagger

1. Open http://localhost:3001/docs.
2. Log in via the web UI first (sets the session cookie the browser shares).
3. Find the **instructors** tag.
4. Try each endpoint:

| Endpoint                     | What to verify                                                               |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `POST /instructors`          | Creates an instructor. Returns `201` with the new record.                    |
| `GET /instructors`           | Returns paginated list. Confirm pagination works.                            |
| `GET /instructors/:id`       | Returns a single instructor. Returns `404` for a random UUID.                |
| `PATCH /instructors/:id`     | Updates name/email/specialization/isActive. Returns updated record.          |
| `GET /instructors/available` | Pass `startsAt` / `endsAt`. Returns only active instructors with no overlap. |

### UI smoke test

1. In the sidebar, click **Instructors**.
2. Click **Add Instructor** — fill in name (required), optional email + specialization → submit.
3. Confirm the new row appears in the table.
4. Click **Deactivate** on the row → badge changes to Inactive.
5. Click **Reactivate** → badge changes back to Active.
6. If > 25 instructors exist, confirm **Previous / Next** pagination buttons work.

### Availability test

1. Create instructor "Alice" (active).
2. Create a GymSession (via seeder or B1 once built) for Alice from 10:00–11:00.
3. Call `GET /instructors/available?startsAt=<10:00>&endsAt=<11:00>`.
4. **Alice should NOT appear** (overlapping session).
5. Call with a non-overlapping window (e.g., 12:00–13:00).
6. **Alice SHOULD appear**.
7. Deactivate Alice and call again — she should be excluded even in the free window.
8. Cancel the session (status → CANCELLED) and call with the original window again.
9. **Alice SHOULD appear** (cancelled sessions do not block slots).

---

## 8. Feature A — Smoke test checklist (done by teammate)

> Feature A is complete. Keep these steps for regression testing.

| Area          | Verify                                                                              |
| ------------- | ----------------------------------------------------------------------------------- |
| Gym register  | Submit form at `/register` → appears in SUPER_ADMIN gyms list                       |
| Approval      | SUPER_ADMIN approves → gym status → ACTIVE                                          |
| Members       | Create / edit / filter by status; second gym sees none                              |
| Plans         | Create / deactivate; price displayed in dollars (cents ÷ 100)                       |
| Subscriptions | Assign plan → end date computed; cancel a subscription                              |
| Member portal | Invite member → magic link in Mailpit → member logs in → sees only own subs + plans |

---

## 9. Checking logs

- **API logs:** visible in the terminal running `npm run dev` (or the turbo output).
- **Mail:** http://localhost:8025 — all outbound email is caught by Mailpit.
- **Database:** connect with any Postgres client to `localhost:5433`, database `bootcamp_starter`.

---

## 10. Resetting the database

```bash
# Blow away all data and re-seed
npx turbo run db:migrate -- --name reset
npx turbo run db:generate
npx turbo run db:seed
```

---

## 11. Troubleshooting

| Symptom                                   | Fix                                                          |
| ----------------------------------------- | ------------------------------------------------------------ |
| `Cannot connect to database`              | Run `npm run services:init` to start Docker services         |
| `401 Not authenticated` in Swagger        | Log in via the web UI first so the cookie is set             |
| `403 Insufficient role` on an admin route | Make sure you are logged in as `ORG_ADMIN`, not `MEMBER`     |
| Magic link doesn't arrive                 | Check Mailpit at http://localhost:8025                       |
| Type errors after pulling changes         | Run `npx turbo run db:generate && npx turbo run check-types` |
| Stale SWR cache in the UI                 | Hard-refresh (Ctrl+Shift+R) or clear local storage           |
