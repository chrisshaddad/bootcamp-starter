# Pharmacy Panel — Remaining Work (team distribution)

**Status:** Foundation (role routing, guards, sidebar, stub areas) and the **Employees** slice are done.
Everything below is a **vertical slice** — one owner takes it end to end. Copy the finished
**Employees** slice as the template (`apps/api/src/employees/`, `packages/contracts/src/employees/`,
`apps/web/hooks/use-employees.ts`, `apps/web/app/(authenticated)/pharmacy/employees/page.tsx`).

## The 4-step build order (every slice)

1. **Contracts** — Zod schemas in `packages/contracts/src/<area>/`, then `npx tsc -p packages/contracts`.
2. **API** — `apps/api/src/<area>/` module. Controller with `@Roles(...)` + `ZodValidationPipe`; service scopes every query by `@CurrentUser()` (`actor.pharmacyId` / `actor.branchId`) and writes an audit entry on mutations. Register in `app.module.ts`.
3. **Hook** — `apps/web/hooks/use-<area>.ts` (SWR read hook + actions hook).
4. **Pages** — under the already-guarded area folder. Enable the sidebar item (drop `disabled: true`).

**Golden rules:** tenant scope comes from the session user, never the request body. No role hierarchy — list every allowed role in `@Roles(...)` and in the frontend `RoleGuard`.

---

## Package A — Branches (owner: \_\_\_)

- **Route / role:** `/pharmacy/branches` — `PHARMACY_ADMIN`
- **Main functions:**
  - List branches (name, phone, address, lat/long, staff count).
  - Create branch, edit branch, delete branch (warn if it still has staff).
  - Use the existing **map location picker** for latitude/longitude (already in the codebase — reuse it).
- **Contracts:** `branches/` already has `branch.response`, `branch-create.request`, `branch-update.request`. Add a pharmacy-scoped `branch-list.response` if needed.
- **API:** `apps/api/src/branches/` — `@Roles('PHARMACY_ADMIN')`, scoped to `actor.pharmacyId`. (The super-admin path lives under `/pharmacies/:id/branches`; this is the admin's own `/branches`.) Audit: reuse `BRANCH_CREATE/UPDATE/DELETE`.
- **Hook:** `use-branches.ts`.
- **Priority:** do this **first** — employees and dashboards both reference branches.

## Package B — Stock (owner: \_\_\_)

- **Routes / roles:** `/stock` and `/stock/[medicineId]` — `STOCK_MANAGER` (add `PHARMACY_ADMIN` for cross-branch oversight)
- **Main functions:**
  - `/stock`: list medicines grouped with **total quantity, batch count, nearest expiry**; visual flags for low quantity / near-expiry; search by name/barcode; **scan barcode** → found = use existing medicine, not found = create medicine; **add batch** (medicine, batch number, quantity, expiry).
  - `/stock/[medicineId]`: all batches for one medicine; edit quantity/expiry; delete batch (confirm); total recalculated from batches.
  - **Every write produces an audit log entry.**
- **Data model:** `StockBatch` (exists) is scoped by `branchId` only — stock manager filters by their `branchId`; admin joins through `branch → pharmacyId`. Reuses the **global Medicine catalog** (already built).
- **Contracts:** new `stock/` (batch list/create/update, medicine-stock summary). Reuse medicine contracts for the create-if-not-found path.
- **API:** `apps/api/src/stock/`. New audit constants: `STOCK_BATCH_CREATE/UPDATE/DELETE` + entity `StockBatch`.
- **Hook:** `use-stock.ts`.

## Package C — Inquiries (owner: \_\_\_)

- **Routes / roles:** `/inquiries` and `/inquiries/[id]` — `INQUIRY_OFFICER`
- **Main functions:**
  - `/inquiries`: inquiry queue **scoped to the branch**; status tabs (Pending / In progress / Answered / Closed); columns client, medicine, status, last updated.
  - `/inquiries/[id]`: conversation thread (client vs employee styling); **reply box** → adds employee message + auto-moves status to In progress; status selector (+ audit); **context panel** with client info and **live stock lookup** for that medicine at this branch.
- **Data model:** `Inquiry` carries both `pharmacyId` + `branchId` (scope directly). `InquiryMessage` scopes via its parent inquiry. Statuses: `PENDING, IN_PROGRESS, ANSWERED, CLOSED`.
- **Contracts:** new `inquiries/` (list, thread/messages, reply, status-update).
- **API:** `apps/api/src/inquiries/`. New audit constants: `INQUIRY_REPLY`, `INQUIRY_STATUS_CHANGE` + entity `Inquiry`.
- **Hook:** `use-inquiries.ts`.
- **Note:** the client-side of inquiries (consumer asks a question, `/my/inquiries`) is a separate CLIENT-app task; this package is the **staff/officer** side only.

## Package D — Dashboards + Pharmacy Audit (owner: \_\_\_)

- **Routes / roles:**
  - `/pharmacy` (currently a placeholder) — `PHARMACY_ADMIN`: KPI cards across all branches (branches, employees, open inquiries, low-stock count) + per-branch summary cards linking into each branch.
  - `/branch` (placeholder) — `PHARMACY_MANAGER` / `PHARMACY_EMPLOYEE`: low-stock alerts, near-expiry alerts, open inquiry count, recent branch activity. Manager = full, employee = read-mostly.
  - `/pharmacy/audit` — `PHARMACY_ADMIN`: audit log filtered to this pharmacy's users (mirror the super-admin audit console, pharmacy-scoped).
- **Main functions:** aggregate the numbers produced by Packages B and C.
- **Contracts / API:** extend `stats/` with pharmacy- and branch-scoped stat endpoints; reuse `audit/` for the pharmacy-scoped audit read.
- **Hook:** `use-pharmacy-stats.ts` (+ reuse audit hook).
- **Dependency:** build this **last** — it needs Stock and Inquiries to exist to show real numbers.

---

## Suggested distribution & order

| Order        | Package                    | Depends on                         |
| ------------ | -------------------------- | ---------------------------------- |
| 1 (first)    | **A — Branches**           | Foundation                         |
| 2 (parallel) | **B — Stock**              | Foundation (uses Medicine catalog) |
| 2 (parallel) | **C — Inquiries**          | Foundation                         |
| 3 (last)     | **D — Dashboards + Audit** | B + C                              |

A goes first (unblocks the rest). B and C run in parallel by two people. D closes it out once B and C land. Each owner works in their own folders, so no collisions — the only shared files (sidebar, `app.module.ts`, contracts `index.ts`) are append-only.
