# Margin — Frontend Prototype Spec

> The implementation contract for the **frontend-only, mock-data prototype**. If the build and this doc
> disagree, this doc wins — change the doc first, then the code. Terminology is defined in
> [CONTEXT.md](./CONTEXT.md); the visual system in [DESIGN.md](./DESIGN.md).

## 1. Purpose & scope

A clickable, demo-ready prototype that shows how Margin will look and flow end-to-end, on **mock data
only**. It exists to align on UX and visual direction before the real full-stack build (Next.js + NestJS
+ Prisma) begins.

**In scope**

- Marketing **landing page**.
- Simulated **magic-link auth** (sign up / log in, no passwords, no real email).
- **Org onboarding**: create an Organization, or join one via an invite link.
- **Members** list with Role assignment (Admin ↔ Member role).
- **Items** (Products + Services) CRUD.
- **Expense Categories** CRUD.
- **Expenses** CRUD (with Category + optional recurrence).
- **Profitability dashboard** (Revenue, Gross/Net Margin, Contribution Margin per Item, expense
  breakdown, break-even) — all figures computed in code from mock data.
- **AI chat** with preset Actions whose replies reference the computed figures.

**Out of scope (deferred, document as "future")**

- Any backend, real database, real auth, real AI calls. Everything is in-browser mock state.
- CSV/Excel import (in the proposal; **not** in this prototype).
- Platform-level Super Admin console.
- Manual Sale entry (Sales are seeded; the dashboard/AI consume them).
- Multi-currency (USD only), light mode (dark only), real billing/payments.

## 2. Stack & conventions

- **Next.js (App Router) + React + TypeScript**, mirroring the real app so screens port over.
- **Tailwind v4** with the `@theme inline` token system from [DESIGN.md](./DESIGN.md). Purple primary on
  a dark background. Use semantic tokens (`bg-primary-base`, `text-gray-*`, `border-border`, etc.) — no
  hardcoded hex in components.
- **shadcn/ui** primitives in `components/ui/` — do not hand-edit; add via the CLI.
- **Mock state**: a single client-side store (React Context + `useReducer`, persisted to
  `localStorage`), seeded on first load. Mutations (add Item, assign Role, etc.) update the store and
  re-render — the app feels real without a server. See §6.
- **Server vs client components**: default to server components for static/marketing; mark interactive
  screens `'use client'` (they read the store).
- Mirror the real app's folder feel: `app/`, `components/`, `components/ui/`, `lib/`, `hooks/`.
- No `console.log` in committed code; surface feedback with toasts (`sonner`).

## 3. Roles & permissions

Two Organization Roles (see [CONTEXT.md](./CONTEXT.md)). The current Member's Role gates the UI.

| Capability                                  | Admin | Member role |
| ------------------------------------------- | :---: | :---------: |
| View dashboard & all data                   |  ✅   |     ✅      |
| Use AI chat                                 |  ✅   |     ✅      |
| Create / edit / delete Items                |  ✅   |     ❌      |
| Create / edit / delete Expense Categories   |  ✅   |     ❌      |
| Create / edit / delete Expenses             |  ✅   |     ❌      |
| Invite Members / copy invite link           |  ✅   |     ❌      |
| Assign Roles to Members                     |  ✅   |     ❌      |

Member-role users see the same screens but with create/edit controls hidden or disabled (with a
tooltip: "Only Admins can edit this"). A **role switcher** in the dev/demo toolbar lets the presenter
flip the current Member between Admin and Member role to show both states. (Demo affordance only — would
not ship.)

## 4. Information architecture (routes)

```
/                         Landing page (public)
/login                    Email entry → simulated magic-link
/auth/verify              "We sent you a link" → Continue (simulates clicking the link)
/onboarding               Choose: Create organization | Join with a link
/onboarding/create        Create organization form → becomes Admin
/join/[token]             Invite-link landing → Join (becomes Member role)

(app shell — sidebar + topbar, all below require a "signed-in" mock session)
/dashboard                Profitability dashboard (default landing after auth)
/items                    Items list (Products + Services) + add/edit
/expenses                 Expenses list + add/edit
/expenses/categories      Expense Categories list + add/edit
/members                  Members list + Role assignment + invite link
/insights                 AI chat with preset Actions
/settings                 Organization + profile (light: name, currency=USD, members count)
```

The authenticated routes share one layout: **left sidebar** (nav + org switcher + current user) and a
**top bar** (page title, role switcher demo toggle, "Invite" for Admins). Mirrors the real app's
`app/(authenticated)/layout.tsx` shape.

## 5. Screen specs

Each screen: purpose → key layout → states → interactions → role gating.

### 5.1 Landing (`/`)

- **Purpose:** sell Margin. Hero, value props, how-it-works, AI-insight teaser, CTA to sign up.
- **Layout:** sticky top nav (logo, "Log in", "Get started"); hero with headline ("Know your margins.
  Grow your profit."), sub-copy, primary CTA, a stylized dashboard preview/screenshot mock; 3–4 feature
  cards (Track expenses & sales / Real profitability metrics / AI insights tied to real numbers /
  Multi-tenant & roles); a "how it works" 3-step strip; footer.
- **States:** static. CTAs route to `/login`.
- **Role gating:** none (public). Dark, purple-accented, marketing-grade polish.

### 5.2 Login (`/login`) & Verify (`/auth/verify`)

- **Purpose:** simulated passwordless entry.
- **Login:** centered card, email input, "Send magic link" button → routes to `/auth/verify?email=…`.
  Toggle copy for "Sign up" vs "Log in" (same flow). Validate email format (react-hook-form + zod).
- **Verify:** "Check your inbox" card showing the email, a faux "We emailed a link to …" message, and a
  **Continue** button that simulates clicking the link → if the User has no Organization, go to
  `/onboarding`; otherwise `/dashboard`. (Mock: a brand-new email has no org.)

### 5.3 Onboarding (`/onboarding`, `/onboarding/create`, `/join/[token]`)

- **Choose (`/onboarding`):** two large cards — **Create an organization** (→ create) and **Join an
  organization** (paste invite link or "I have a link"). 
- **Create (`/onboarding/create`):** form — org name, business type (optional), currency (USD, locked).
  On submit: create the Organization in the store, make the current User its **Admin**, seed it with the
  bike-shop mock dataset (§6), route to `/dashboard`.
- **Join (`/join/[token]`):** shows the target Organization name (resolved from the mock token) and
  "You'll join as a Member and an Admin will set your access." **Join** button adds the current User as a
  Member with the Member role and routes to `/dashboard` (read-only state).

### 5.4 Dashboard (`/dashboard`)

- **Purpose:** the profitability picture, and the springboard to AI insights.
- **Layout (top → bottom):**
  1. **KPI cards** row: Revenue, Gross Margin (amt + %), Net Margin (amt + %), Break-even (with progress
     toward it). Each card: label, big value, small trend hint vs prior period.
  2. **Revenue vs Expenses** chart (e.g. bars or area over the last N months).
  3. **Expense breakdown** by Category (donut or horizontal bars, with % of total).
  4. **Top & bottom Items by Contribution Margin** (two short ranked lists / table, Product/Service
     badge per row).
  5. **"Ask the AI" teaser** card → links to `/insights` with the Action chips.
- **States:** populated from mock data. (Also define an **empty state** for a freshly created org with no
  Sales yet — but the seed gives data, so empty state is a documented edge, low priority.)
- **Role gating:** all Roles can view. No editing here.

### 5.5 Items (`/items`)

- **Purpose:** manage the Products and Services the Organization sells.
- **Layout:** header with title + "Add item" (Admin only); filter tabs (All / Products / Services);
  table — Name, Type badge, Price, Unit cost, Contribution Margin (computed), Units sold (from mock
  Sales), status. Row actions: edit, delete (Admin only).
- **Add/Edit:** dialog or sheet — name, type (Product/Service), price, unit cost. Contribution Margin is
  shown live (price − cost). Persists to store.
- **Role gating:** Member role sees the table read-only; add/edit/delete hidden.

### 5.6 Expenses (`/expenses`) & Categories (`/expenses/categories`)

- **Expenses:** header + "Add expense" (Admin); table — Date, Category (colored chip), Description,
  Amount, Recurrence badge. Filter by Category. Add/Edit dialog: amount, category (select), description,
  date, recurring toggle (+ cadence: monthly/weekly/yearly).
- **Categories:** header + "Add category" (Admin); list/table — Name, color, # of expenses, total spent,
  recurring flag. Add/Edit: name, color swatch picker. Deleting a Category with expenses warns.
- **Role gating:** Member role read-only.

### 5.7 Members (`/members`)

- **Purpose:** show who's in the Organization and manage access.
- **Layout:** header + **"Invite"** button (Admin) that opens a dialog with a copyable mock invite link
  (`/join/<token>`); table — Avatar+Name, Email, Role (badge), Joined date, status. Role cell for each
  Member: Admin can change via a select (Admin ↔ Member role); cannot demote the last Admin.
- **States:** seed includes the current Admin + a couple of Members (one Member role, one Admin).
- **Role gating:** Member role sees the roster read-only; no invite, no Role editing.

### 5.8 AI Insights chat (`/insights`)

- **Purpose:** the headline AI feature — a chat where the user picks preset **AI Actions** and gets
  Insights tied to the computed figures.
- **Layout:** a chat column. Empty/initial state shows a short intro from the assistant + a row of
  **Action chips**:
  - "What's my least-selling item?"
  - "What's my top-performing item?"
  - "What do you recommend based on my sales?"
  - "What do you recommend based on my expenses?"
- **Interaction:** clicking a chip appends a user bubble, shows a brief typing indicator, then renders an
  assistant **Insight** message. Each Insight: a headline tied to a real figure (pulled from the same
  computed metrics as the dashboard), a **suggested action**, and a **caveat** line. Where useful, show a
  small inline figure/stat chip (e.g. the Item name + its Contribution Margin).
- **Mock model:** responses are generated in-browser from the computed metrics (templated, data-driven —
  not hardcoded lorem). No network call. A decorative free-text input sits at the bottom; submitting it
  returns a polite "In the prototype, try one of the suggested actions above." (or routes to the closest
  Action). Document this clearly as a mock.
- **Role gating:** all Roles can use the chat.

### 5.9 Settings (`/settings`)

- Minimal: Organization name (Admin editable), currency (USD, locked), member count, and a "danger
  zone" placeholder (non-functional). Profile: name, email (read-only). Low priority / polish.

## 6. Mock data model & seed

Shapes (TypeScript, in `lib/types.ts`); the store seeds a **bike shop** ("Cog & Sprocket Cycles") so
every metric and AI Insight has believable numbers.

```ts
type Role = 'ADMIN' | 'MEMBER';            // platform SUPER_ADMIN exists in type union but unused in UI
type ItemType = 'PRODUCT' | 'SERVICE';
type Cadence = 'ONE_OFF' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface User { id; name; email; }
interface Organization { id; name; currency: 'USD'; createdAt; }
interface Member { id; userId; orgId; role: Role; joinedAt; user: User; }
interface Item { id; orgId; name; type: ItemType; price: number; unitCost: number; }
interface Sale { id; orgId; itemId; quantity: number; soldAt: string; } // seeded only
interface ExpenseCategory { id; orgId; name; color: string; recurring: boolean; }
interface Expense { id; orgId; categoryId; description; amount: number; date: string; cadence: Cadence; }
```

**Computed metrics** (pure functions in `lib/metrics.ts`, consumed by dashboard **and** AI):
revenue, COGS, grossMargin{amount,pct}, totalExpenses, netMargin{amount,pct}, breakEvenRevenue,
contributionMarginByItem[], unitsSoldByItem[], topItems[], bottomItems[], expenseByCategory[].

**Seed (bike shop), illustrative:**

- Items — Products: Road Bike, Hybrid Bike, Inner Tube, Helmet, Bike Lock. Services: Basic Tune-up,
  Full Service, Wheel Build, Flat Repair. Each with a sensible price/unitCost so margins differ (a Flat
  Repair should look high-margin; an Inner Tube low-margin) to give the AI something to say.
- Sales — a few months of mock Sales weighted so there's a clear top performer and a clear laggard.
- Expense Categories — Rent (recurring), Payroll (recurring), Parts & Supplies, Marketing, Utilities
  (recurring), Insurance.
- Expenses — a believable spread so Net Margin is positive-but-thin and break-even is meaningful.
- Members — current Admin (the demo user), one other Admin, one Member-role user.

`lib/seed.ts` exports the dataset; the store loads it on first run and on "create organization".

## 7. AI Action → figure mapping

| Action                         | Reads from `metrics`                              | Insight shape                                   |
| ------------------------------ | ------------------------------------------------- | ----------------------------------------------- |
| Least-selling item             | `bottomItems`, `unitsSoldByItem`                  | names the laggard Item + figure + action/caveat |
| Top-performing item            | `topItems`, `contributionMarginByItem`            | names the best Item by Contribution Margin      |
| Recommend based on sales       | `topItems`, `bottomItems`, `grossMargin`          | 1–2 actions to shift mix toward high-margin Items |
| Recommend based on expenses    | `expenseByCategory`, `netMargin`, `breakEven`     | flags the biggest Category, suggests a lever    |

Every Insight cites a real number, includes one suggested action and one caveat — mirroring the
proposal's "tied to real numbers, not generic advice" rule.

## 8. Visual system

See [DESIGN.md](./DESIGN.md): purple primary over a dark background, mirroring the real app's
`@theme inline` token structure (`--color-primary-base/400/300/200/100`, `--color-gray-*`, semantic
shadcn vars) so components transfer. Dark mode only. WCAG AA contrast for text and interactive states.

## 9. Build order (for the implementation phase)

1. Foundation: tokens/globals, app shell (sidebar+topbar), store + seed + metrics, shadcn components.
2. Auth + onboarding + join flows.
3. Dashboard.
4. Items, Expenses, Categories.
5. Members + role assignment + invite.
6. AI insights chat.
7. Landing page.
8. Polish pass + verify (run app, screenshot each route).
