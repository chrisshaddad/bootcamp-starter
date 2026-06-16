# Margin — Frontend Prototype

A clickable, **frontend-only** prototype of **Margin**, a multi-tenant B2B app that helps small
businesses understand and improve profitability: track sales & expenses → see profitability metrics →
get AI insights tied to real numbers.

> **This is a prototype.** No backend, no real auth, no real AI. All state is mock data held in the
> browser (React context + `localStorage`), seeded with a sample bike shop. It exists to align on UX and
> visual direction before the real full-stack build (Next.js + NestJS + Prisma).

## Run it

This is a **self-contained app** that lives at `prototype/` in the monorepo but is **not** a workspace —
it has its own dependencies and is not part of `turbo`/CI. Run it on its own:

```bash
cd prototype
npm install
npm run dev        # http://localhost:3002
```

Land on `/` (marketing page) → **Get started** → simulated magic-link sign-in → the app. Or click
**Explore the demo workspace** on the login screen to jump straight into the seeded bike shop.

> Uses port **3002** so it can run alongside the main app (web :3000, api :3001).

## What's inside

| Area         | Notes                                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| Landing page | Marketing site at `/`                                                          |
| Auth         | Simulated magic-link (`/login` → `/auth/verify`), no passwords, no email        |
| Onboarding   | Create an org, or join one via invite link (`/join/[token]`)                    |
| Dashboard    | Revenue, gross/net margin, contribution margin, expense breakdown, break-even   |
| Items        | Products & services; add/edit/delete (Admin) with live margin calc             |
| Expenses     | Records with category + recurrence; Categories with color & cadence            |
| Members      | Roster, role assignment (Admin ↔ Member), copyable invite link                 |
| AI Insights  | Action-chip chat; replies cite real computed figures + a suggested action + caveat |

**Demo affordances:** the topbar **Preview as Admin / Member** toggle flips role-gating live; the user
menu has **Reset demo data**. Neither would ship.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui (on Base UI) · recharts ·
Manrope. Dark mode only, purple-on-dark theme. Mirrors the real app's stack and Tailwind token system so
components transfer.

## Project structure

```
app/
  page.tsx              landing  ·  (auth)/ login, verify, onboarding, join
  (app)/                authenticated shell + dashboard, items, expenses, members, insights, settings
components/
  ui/                   shadcn primitives (Base UI) — don't hand-edit
  app/                  shared app components (shell, dialogs, badges, charts, stat cards)
  marketing/  brand/    landing sections · logo
lib/
  types · seed · metrics · ai · format · store (the mock store) · nav
docs/
  CONTEXT.md            domain glossary (source of truth for terminology)
  SPEC.md               the product/UX spec — change this first if the build diverges
  DESIGN.md             the purple-on-dark visual system + accessibility checks
  screenshots/          rendered reference screenshots
```

## How it maps to the real build

- **Metrics are computed in code** (`lib/metrics.ts`) — the AI only interprets finished figures, exactly
  as the proposal requires. `lib/ai.ts` is the mock stand-in for the Gemini call.
- **Multi-tenant scoping** is modeled: all data is filtered by the current organization.
- **Design tokens** match the real app's `@theme inline` structure, so styled components port over.
- **Deferred** (in the proposal, not this prototype): CSV/Excel import, real auth/AI/DB, platform
  Super Admin console, manual sale entry, multi-currency.

See [`docs/SPEC.md`](docs/SPEC.md) for the full contract and [`docs/CONTEXT.md`](docs/CONTEXT.md) for the
glossary.

## Build

```bash
npm run build      # type-checks and prerenders all routes
```
