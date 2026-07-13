# Client Portal — Remaining Work (team distribution)

**Status:** The staff side is done — role routing/guards/sidebar, the pharmacy admin panel, and the Stock / Inquiries / Dashboards slices all shipped. What's left is the **consumer-facing CLIENT portal**: a signed-in client browses the medicine catalog, finds **alternatives** and the **nearest pharmacies that stock a medicine**, browses a **pharmacy directory**, and **asks a pharmacy** an inquiry then tracks the conversation.

Everything below is a **vertical slice** — one owner takes it end to end. Copy a finished staff slice as the template (`apps/api/src/inquiries/`, `packages/contracts/src/inquiries/`, `apps/web/hooks/use-inquiries.ts`, `apps/web/app/(authenticated)/inquiries/`). Two owners: **Person A** and **Person B**, each takes their packages end to end.

## The 4-step build order (every slice)

1. **Contracts** — one Zod schema per file in `packages/contracts/src/<area>/`. Export each from the area's `index.ts` **and** add the area to the root `packages/contracts/src/index.ts` barrel, then run `npx tsc -p packages/contracts` so both `apps/api` and `apps/web` can import the new wire types. (Skipping either barrel means the type won't resolve on import.)
2. **API** — `apps/api/src/<area>/` module. **Every** controller handler validates its request body/query/params with `ZodValidationPipe`, using the schema imported from `@repo/contracts` — never an inline DTO. Put `@Roles('CLIENT')` on the controller and pass `@CurrentUser()` into the service. The service scopes every private row to the **session client** (`actor.id` as `clientId`) and writes an audit entry on mutations. Register the module in `app.module.ts`.
3. **Hook** — `apps/web/hooks/use-<area>.ts` (SWR read hook + actions hook; bare-path keys, `apiPost/apiPatch`, revalidate by prefix).
4. **Pages** — under the guarded client area folder. Enable the sidebar item once the pages exist.

**Golden rules:** a client only ever sees their **own** private data — scope by `actor.id` (`clientId`), never a request-body id. The **Medicine catalog and pharmacy directory are global and read-only** for clients (reuse `MedicinesService`, don't fork it). List every allowed role explicitly in `@Roles(...)` and in the frontend `RoleGuard` — no role hierarchy. Any id a client *does* send (pharmacyId / branchId / medicineId) must be **validated for consistency server-side** (branch belongs to pharmacy; branch actually stocks the medicine) before it's trusted.

---

# Person A

## Package A1 — Client foundation (owner: Person A)

- **Goal:** stand up the client area shell so every client page has a home, a guard, and a nav — and give the client a saved location (the origin for "nearest").
- **Main functions:**
  - Point `ROLE_HOME.CLIENT` at the new landing (`/find`) in `apps/web/lib/role-routes.ts` (today it falls back to `/dashboard`). The `/dashboard` dispatcher already redirects via this map.
  - Add a `case 'CLIENT'` to `panelForRole` in `apps/web/components/app-sidebar.tsx` → nav items: **Find medicines** (`/find`), **Pharmacies** (`/pharmacies`), **My inquiries** (`/my/inquiries`), plus the shared **Settings**. Use `disabled: true` ("Soon") for any page not built yet.
  - New guarded client layouts: `apps/web/app/(authenticated)/find/layout.tsx`, `.../pharmacies/layout.tsx`, `.../my/layout.tsx`, each wrapping children in `<RoleGuard allow={['CLIENT']}>` (mirror `inquiries/layout.tsx`). The authenticated shell (sidebar + topbar) already wraps everything.
  - **Set your location (onboarding + settings):** capture the client's location with the existing **`LocationPicker`** (`apps/web/components/location-picker.tsx`) — add it to the **signup** flow (`apps/web/app/signup/`) as an optional step and to the shared **Settings** page, saved through the existing `PATCH /profile` (its `profileUpdateRequestSchema` already accepts `address`, `latitude`, `longitude`; `ProfileController` is open to any authenticated user). Change-password is already available via `change-password-card` on Settings — no new work there. This saved `User.latitude/longitude` is what "nearest" reads.
- **Contracts / API:** none new — reuses `/profile`.
- **Priority:** do this **first** — it unblocks everything else.

## Package A2 — Find medicines: catalog, alternatives & nearest availability (owner: Person A)

- **Routes / role:** `/find` and `/find/[medicineId]` — `CLIENT`
- **Main functions:**
  - `/find`: browse/search the global medicine catalog — search box (brand name / barcode / ingredient) + simple filters (type, form); paginated results grid showing `brandName`, ingredients, price (`priceLbp`). **Barcode scan:** reuse the existing **`barcode-scan-field`** component (already used in stock/admin) so a client can scan a box → the scanned code drives the search / jumps to the exact match.
  - `/find/[medicineId]`: medicine detail, and two sections:
    - **Alternatives** — other medicines that share an active ingredient (via the `Ingredient` + `MedicineIngredient` join tables), excluding itself, so a client can find a substitute/generic.
    - **Available near you** — the pharmacies/branches that currently stock this medicine, sorted **nearest-first**, each row showing distance, in-stock quantity, nearest expiry, a small **map** (reuse `LocationMap`) / **directions** link (an external maps URL built from the branch lat/long — no API), and an **"Ask this pharmacy"** action that links into Person B's create flow: `/my/inquiries/new?medicineId=<id>&branchId=<id>`.
- **Data model:** the **global Medicine catalog** (reuse `MedicinesService.list` / `getById` — already consumed by `InquiriesService`). Alternatives = query `MedicineIngredient` for the medicine's ingredient ids, then medicines sharing any of them. Availability = aggregate `StockBatch` for that `medicineId`, grouped by `branchId` (sum `quantity`, batch count, nearest `expiryDate` — the same rollup `InquiriesService.buildDetail` already builds), joined to `PharmacyBranch` + `Pharmacy` for name/address/coords, **in-stock only**. Distance = **haversine** from the client's saved location (`actor.latitude/longitude`) to each `PharmacyBranch.latitude/longitude` (both `Decimal(9,6)`, no PostGIS → compute in raw SQL ordered+limited, or in the service; the `idx_branch_location` index exists).
- **Contracts:** new `catalog/` area — reuse `medicineResponseSchema` for browse/detail/alternatives; add `medicine-availability.request` (optional `lat`/`lng` override, defaulting to the caller's saved location) and `medicine-availability.response` (pharmacy name, branch name + address + coords, `distanceKm`, `totalQuantity`, `nearestExpiry`). Add the area to both barrels.
- **API:** new `apps/api/src/catalog/` — `@Roles('CLIENT')`, read-only (global catalog, no pharmacy scope). `GET /catalog/medicines` (browse; supports a `barcode`/`search` filter), `GET /catalog/medicines/:id` (detail), `GET /catalog/medicines/:id/alternatives`, `GET /catalog/medicines/:id/availability` (nearest — origin from the session user; if the client has no saved location, return a clear "set your location" signal instead of an unordered list). Validate every query/param with `ZodValidationPipe`. Register the module in `app.module.ts`. (No writes → no audit.)
- **Hook:** `use-catalog.ts` (browse + detail + alternatives) and `use-medicine-availability.ts`.
- **Priority:** after A1.

---

# Person B

## Package B1 — My inquiries (owner: Person B)

- **Routes / role:** `/my/inquiries`, `/my/inquiries/new`, `/my/inquiries/[id]` — `CLIENT`
- **Main functions:**
  - `/my/inquiries/new`: **ask a pharmacy** — a form prefilled from `?medicineId=&branchId=` (arriving from Package A2's medicine detail); confirm the branch + write a first message → submit.
  - `/my/inquiries`: the client's **own** inquiries; status tabs (Pending / In progress / Answered / Closed); columns pharmacy, branch, medicine, status, last updated.
  - `/my/inquiries/[id]`: conversation thread (client vs. pharmacy styling); a **reply box** appends a client follow-up message; a context header shows the medicine and which pharmacy/branch it's with; the client can **close (or reopen) their own inquiry** (status → `CLOSED` / back to `PENDING`).
- **Data model:** `Inquiry` (`clientId`, `pharmacyId`, `branchId`, `medicineId`, `status`) + `InquiryMessage` (`senderType` is `CLIENT | EMPLOYEE`, `senderId` nullable). Client scope = `actor.id` as `clientId`. Statuses: `PENDING, IN_PROGRESS, ANSWERED, CLOSED`. Note: creating an inquiry is **net-new runtime logic** — today only the seeder (`seedInquiries.ts`) writes `Inquiry` rows.
- **Contracts:** new `my-inquiries/` area — `client-inquiry-create.request` (`medicineId`, `branchId`, `message`), `client-inquiry-list.response` (pharmacy / branch / medicine names + status + `updatedAt`), `client-inquiry-detail.response` (thread + medicine + pharmacy/branch), a small `client-inquiry-status.request` (`CLOSED` / reopen only), and reuse the existing `inquiry-reply.request` (`{ message }`) for follow-ups. Add the area to both barrels.
- **API:** new `apps/api/src/my-inquiries/` — `@Roles('CLIENT')`, **every query scoped to `actor.id`**:
  - `POST /my/inquiries` — runs as **one Prisma `$transaction`:** re-validate that `branchId` belongs to `pharmacyId` **and** that the branch actually stocks `medicineId` (never trust the raw body), create the `Inquiry` (status `PENDING`), create the first `InquiryMessage` (`senderType: 'CLIENT'`, `senderId: actor.id`), and write the audit entry — all atomic (mirror the staff `InquiriesService.reply` transaction). `clientId` always comes from the session, never the body. New audit constant `INQUIRY_CREATE` + entity `Inquiry`.
  - `GET /my/inquiries` (own list), `GET /my/inquiries/:id` (own detail — 404 if the row isn't the caller's), `POST /my/inquiries/:id/messages` (client follow-up — `senderType: 'CLIENT'`, ownership re-checked, audit), `PATCH /my/inquiries/:id/status` (client close/reopen only, ownership re-checked, audit).
- **Hook:** `use-my-inquiries.ts`.
- **Note:** the **pharmacy/officer** side of these very same `Inquiry` rows already exists (the staff Inquiries slice under `/inquiries`). This is the **client** counterpart — both read the same table, each from its own scope. Don't touch the staff `inquiries/` module; this lives entirely under new `my-inquiries/` folders, so there are no collisions.

## Package B2 — Pharmacy directory (owner: Person B)

- **Routes / role:** `/pharmacies` and `/pharmacies/[branchId]` — `CLIENT`
- **Main functions:**
  - `/pharmacies`: a browsable directory of pharmacies/branches — name, address, phone, and each branch on a **map** (reuse `LocationMap`); search by name/area. (Optional "near me" ordering can reuse the same haversine helper Person A builds in A2, once it lands.)
  - `/pharmacies/[branchId]`: branch detail — its info + map + **directions** link (external maps URL from the branch lat/long), and the **medicines it currently stocks** (aggregated from `StockBatch` for that branch: brand name, in-stock quantity, nearest expiry), each linking back to the medicine detail (`/find/[medicineId]`). An **"Ask this pharmacy"** shortcut can deep-link into B1's create flow.
- **Data model:** global read — `Pharmacy` + `PharmacyBranch` (with geo) + `StockBatch` grouped by `medicineId` for the branch's in-stock list. No tenant scope (public directory); no writes.
- **Contracts:** new `directory/` area — `branch-directory.response` (pharmacy + branch + coords), `branch-detail.response` (branch info + its stocked-medicines rollup). Reuse `medicineResponseSchema` fields where useful. Add the area to both barrels.
- **API:** new `apps/api/src/directory/` — `@Roles('CLIENT')`, read-only. `GET /directory/branches` (list, optional `search`), `GET /directory/branches/:id` (detail + in-stock medicines). Validate query/params with `ZodValidationPipe`; register in `app.module.ts`. (Separate folder from A's `catalog/`, so no collision.)
- **Hook:** `use-directory.ts`.
- **Priority:** after A1; can run in parallel with B1. Independent of A2, though it can reuse A2's distance helper for "near me" if available.

---

## Suggested distribution & order

| Order        | Package                                        | Owner        | Depends on                                   |
| ------------ | ---------------------------------------------- | ------------ | -------------------------------------------- |
| 1 (first)    | **A1 — Client foundation** (+ location capture)| **Person A** | Staff foundation                             |
| 2            | **A2 — Find: catalog, alternatives, nearest**  | **Person A** | A1                                           |
| 2 (parallel) | **B1 — My inquiries** (create/track + close)   | **Person B** | A1 (guard/layout); links from A2             |
| 3 (parallel) | **B2 — Pharmacy directory**                    | **Person B** | A1; optional reuse of A2's distance helper   |

A1 goes first — it lands the client layout, guard, nav, and saved-location so every other package has a home. Then **Person A** builds discovery (catalog + alternatives + the geospatial nearest-availability), while **Person B** builds the inquiry create/track flow and the pharmacy directory. The only cross-package touchpoints are plain hrefs (A2's "Ask this pharmacy" → B1's `/my/inquiries/new`; B2's branch pages → A2's medicine detail) — all **append-only**. B1 can build and test against **seeded** inquiry data before A2 is finished, and B2 is fully independent of A2.

Each owner works in their own folders — the only shared files (`role-routes.ts`, `app-sidebar.tsx`, `app.module.ts`, the contracts `index.ts` barrels, the `signup`/`Settings` pages for location capture) are **append-only**, so no collisions.

### What the finished client portal covers

Browse & search medicines (with barcode scan) · find generic/ingredient **alternatives** · see the **nearest pharmacies** that stock a medicine, with distance + map + directions · a browsable **pharmacy directory** with per-branch stock · **ask a pharmacy** about a specific medicine and hold a threaded conversation · track, follow up on, and close **your own inquiries** · set and manage **your location** (signup + settings) with the existing map picker · change password (existing). All of it reuses the current data model — **no migration required**.
