# Test Accounts & Login Credentials

> These accounts are created by the database seeder (`packages/database/prisma/seeders/`).
> To reset them, re-run: `npx turbo run db:seed`
>
> **Login method:** Magic link (passwordless). Enter the email at `/login`, then open [Mailpit](http://localhost:8025) to click the link.

---

## Platform Admin

| Role          | Email              | Name        | Use for                                                               |
| ------------- | ------------------ | ----------- | --------------------------------------------------------------------- |
| `SUPER_ADMIN` | `admin@gymflow.io` | Super Admin | Approving gym registrations, viewing all tenants, platform management |

---

## Gym Managers

| Gym               | Email                              | Name             | Status        |
| ----------------- | ---------------------------------- | ---------------- | ------------- |
| Iron Peak Fitness | `sarah.chen@ironpeakfitness.com`   | Sarah Chen       | Active        |
| FlexZone Gym      | `michael@flexzonegym.com`          | Michael Torres   | Active        |
| Mountain Wellness | `emily.watson@mountainwellness.co` | Dr. Emily Watson | Active        |
| City Boxing       | `roberto@cityboxingclub.com`       | Roberto Martinez | Active        |
| Velocity Sports   | `jake@velocitysports.fit`          | Jake Williams    | Active        |
| ProFit Training   | `anna.davis@profittraining.com`    | Anna Davis       | **Suspended** |

---

## Gym Members (Portal Access)

These accounts have portal login enabled. Use them to test the member self-service portal.

| Gym               | Email                         | Name         | Status |
| ----------------- | ----------------------------- | ------------ | ------ |
| Iron Peak Fitness | `alex.johnson92@gmail.com`    | Alex Johnson | Active |
| Iron Peak Fitness | `maria.s.fitness@outlook.com` | Maria Smith  | Active |
| FlexZone Gym      | `jbrown.athlete@gmail.com`    | James Brown  | Active |

---

## Gym Members (No Portal Access)

These members exist in the database but don't have a portal login account.

| Gym               | Email                         | Name            | Status   |
| ----------------- | ----------------------------- | --------------- | -------- |
| Iron Peak Fitness | `dpark88@yahoo.com`           | David Park      | Active   |
| Iron Peak Fitness | `emmawilson.fit@icloud.com`   | Emma Wilson     | Inactive |
| FlexZone Gym      | `sofia.rdz@outlook.com`       | Sofia Rodriguez | Active   |
| FlexZone Gym      | `liamchen97@gmail.com`        | Liam Chen       | Active   |
| ProFit Training   | `kenji.tanaka@protonmail.com` | Kenji Tanaka    | Active   |
| ProFit Training   | `priya.p93@gmail.com`         | Priya Patel     | Inactive |

---

## Testing Recipes

### Tenant Isolation

1. Log in as `sarah.chen@ironpeakfitness.com` → create a member or session
2. Log out → log in as `michael@flexzonegym.com`
3. Confirm the data created in step 1 is **not visible** — it belongs to a different gym

### Member Portal

1. Log in as `alex.johnson92@gmail.com` (member with portal access)
2. Verify bookings, subscriptions, and check-in features work from the member perspective

### Suspended Gym

1. Log in as `anna.davis@profittraining.com`
2. Confirm the suspended gym state is handled correctly (redirect to `/suspended`)

### Dark Mode

1. Log in as any account → click the Sun/Moon icon in the top navbar
2. Verify all pages render correctly in both light and dark modes
