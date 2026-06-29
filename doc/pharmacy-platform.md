Pharmacy Platform — Pages, Features & Flow

# ROLES (access model)

| Role | Scope | Home page |
| SUPER\_ADMIN | Whole platform | /admin |
| PHARMACY\_ADMIN | One pharmacy (all its branches) | /pharmacy |
| PHARMACY\_MANAGER | One branch | /branch |
| PHARMACY\_EMPLOYEE | One branch (limited) | /branch |
| STOCK\_MANAGER | One branch (inventory) | /stock |
| INQUIRY\_OFFICER | One branch (inquiries) | /inquiries |
| CLIENT | Public, self only | / |

Every page is gated by three things: role (which menu items appear), status (ACTIVE can use it, PENDING = invited-not-active, SUSPENDED/INACTIVE = blocked), and pharmacyId/branchId (which rows the page is allowed to show).

# A. AUTHENTICATION

## A1. Login (/login)

- Purpose: Entry point for all roles.

### Features:

- -   Magic-link login: enter email → token created → email sent → confirmation screen.
    - Password login (secondary, optional toggle) — User.password is nullable.
    - Link to client sign-up.
- States: idle → submitting → "check your email" / error toast.

## A2. Sign-up (/signup) — CLIENT only

- Purpose: Self-registration for consumers.

### Features:

- -   Fields: first name, last name, email, phone (optional).
    - Forces role = CLIENT, status = ACTIVE.
    - Sends magic link to verify.
- Note: Staff never sign up here — they are invited.

## A3. Verify (/auth/verify)

- Purpose: Consume magic-link token and route the user in.

### Features:

- -   Validates token, marks used, creates session.
    - If status = PENDING (staff invite): "set your password" step → flips to ACTIVE.
    - Role dispatcher: redirects to the correct home page.
    - Handles expired/used token → prompt to request a new link.

# B. SUPER\_ADMIN

## B1. Platform Dashboard (/admin)

- Features: KPI cards (total pharmacies, branches, users, open inquiries); recent activity feed from audit logs.

## B2. Pharmacies (/admin/pharmacies)

### Features:

- -   List all pharmacies with branch/admin counts and status.
    - Search + filter by status.
    - Create pharmacy: name + first pharmacy-admin email → creates pharmacy and invites the admin (PENDING).

## B3. Pharmacy Detail (/admin/pharmacies/\[id\])

### Features (tabbed):

- -   Overview: counts, created date.
    - Branches: list/add branches.
    - Admins: list/invite pharmacy admins.
    - Suspend / re-activate pharmacy (cascades to staff access).

## B4. Users (/admin/users)

### Features: 

Platform-wide user list; filter by role and status; view detail.

## B5. Medicines (/admin/medicines)

- Purpose: Global shared catalog (medicines are not tenant-scoped).

### Features:

- -   List/search by name, barcode, ingredient.
    - Create/edit medicine: brand name, type, form, dosage, barcode, price, ingredients.
    - Link ingredients (many-to-many).

## B6. Audit (/admin/audit)

### Features: 

Full audit log table (user, action, entity, entityId, timestamp); filterable; row opens raw detail JSON.

# C. PHARMACY\_ADMIN (scoped to their pharmacy)

## C1. Pharmacy Dashboard (/pharmacy)

### Features: 

KPIs across all branches (branches, employees, open inquiries, low-stock count); per-branch summary cards linking into each branch.

## C2. Branches (/pharmacy/branches)

### Features:

- -   List/add/edit branches.
    - Fields: name, phone, address, latitude, longitude.
    - Manage staff assigned to each branch.

## C3. Employees (/pharmacy/employees)

### Features:

- -   List employees with role, branch, status.
    - Invite employee: email + role (manager / employee / stock manager / inquiry officer) + branch → creates PENDING user + invite email.
    - Per-employee actions: change role, reassign branch, set INACTIVE / SUSPENDED.

## C4. Pharmacy Audit (/pharmacy/audit)

### Features: 

Audit log filtered to this pharmacy's users.

# D. BRANCH STAFF

## D1. Branch Dashboard (/branch) — MANAGER / EMPLOYEE

### Features: 

Low-stock alerts, near-expiry alerts, open inquiry count, recent branch activity. Cards link into Stock and Inquiries. Manager = full; employee = read-mostly.

## D2. Stock (/stock) — STOCK\_MANAGER

- Purpose: Core inventory workflow (stock = batches; no separate stock table).

### Features:

- -   List medicines grouped with total quantity, batch count, nearest expiry.
    - Visual flags: low quantity, near-expiry.
    - Search by name/barcode.
    - Scan barcode: found → use existing medicine; not found → create medicine.
    - Add batch: medicine, batch number, quantity, expiry date.
    - Every write produces an audit log entry.

## D3. Medicine Batches (/stock/\[medicineId\])

### Features: 

All batches for one medicine; edit quantity/expiry; delete batch (confirmed); total recalculated from batches.

## D4. Inquiries Queue (/inquiries) — INQUIRY\_OFFICER

### Features: 

Inquiry list scoped to branch; status tabs (Pending / In progress / Answered / Closed); columns: client, medicine, status, last updated.

## D5. Inquiry Thread (/inquiries/\[id\])

### Features:

- -   Conversation view (messages ordered by time; client vs employee styling).
    - Reply box → adds employee message, auto-moves status to In progress.
    - Status selector (Pending / In progress / Answered / Closed) → updates + audit log.
    - Context panel: client info + live stock lookup for that medicine at this branch (answer without leaving).

# E. CLIENT (consumer app — lightweight header, no back-office sidebar)

## E1. Search Home (/)

### Features: 

Search medicines by name, barcode, or ingredient; results as medicine cards.

## E2. Medicine Detail (/medicines/\[id\])

### Features: 

Medicine info (form, dosage, price, ingredients); list of pharmacy branches that have it in stock with address/phone; "Ask" button per branch.

## E3. New Inquiry (/inquiries/new)

### Features: 

Pre-filled with medicine + pharmacy + branch; message box; creates inquiry (PENDING) + first client message → opens thread.

## E4. My Inquiries (/my/inquiries)

### Features: 

Client's own inquiry history with status; opens thread.

## E5. My Inquiry Thread (/my/inquiries/\[id\])

### Features: 

Same chat view (mirrored); client can reply; closed inquiries are read-only.

## E6. My Profile (/my/profile)

### Features: 

Edit name, phone, address, date of birth, location (lat/long for distance-based search later).

# F. SHARED (all authenticated roles)

- Settings (/settings): account preferences.
- Profile / avatar menu: profile, settings, logout (clears session).

# G. KEY END-TO-END FLOWS

## G1. Staff onboarding (invite-only)

Admin creates user (PENDING) + assigns role/branch

→ invite email (magic link)

→ user clicks → /auth/verify → set password

→ status ACTIVE → lands on their role's home page

## G2. Inquiry lifecycle (client ↔ officer)

Client: medicine detail → Ask → new inquiry (PENDING) + message

Officer: queue (Pending) → open thread → reply (auto In progress), checks live stock

Client: sees reply → replies

Officer: marks Answered → later Closed (read-only)

## G3. Stock from barcode (stock manager)

Stock → Scan → medicine found? yes: use it / no: create it

→ Add batch (number, quantity, expiry)

→ batch saved + audit log

→ instantly visible to officer stock lookups and client search

# H. CROSS-CUTTING FEATURES

- Audit logging: all important writes (create/update/delete medicine, stock batch, employee, inquiry reply) recorded with user, action, entity, timestamp.
- Tenant isolation: every staff page filters data by the logged-in user's pharmacy/branch — a stock manager only ever sees their own branch's batches.
- Status enforcement: PENDING = invited only; SUSPENDED/INACTIVE blocked at login and per-request.
- Shared catalog: medicines and ingredients are global; stock and inquiries are branch-scoped.
