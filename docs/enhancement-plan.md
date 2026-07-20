# Gym Management System — Enhancement Plan

> **Created:** 2026-07-18  
> **Status:** ⬜ Not started  
> **Prerequisites:** All existing features (A–D) are ✅ complete.  
> **Trackers:** See per-feature progress files under [`progress/`](progress/)

---

## 1 · Problem Statement

The instructor feedback identified eight areas that need work:

| #   | Issue                                                                                       | Severity    |
| --- | ------------------------------------------------------------------------------------------- | ----------- |
| 1   | **UI is too basic / "trash"** — flat white cards, no depth, generic feel                    | 🔴 Critical |
| 2   | **Branding still says "Bootcamp Starter"** — sidebar, login, metadata, footer               | 🔴 Critical |
| 3   | **No dark mode toggle** — dark CSS vars exist but no user-facing toggle                     | 🟡 Medium   |
| 4   | **No page-load animations** — pages pop in without transitions (Slack-style stagger wanted) | 🟡 Medium   |
| 5   | **"Expires Soon" card is ugly** — dashboard badge/card needs redesign                       | 🟡 Medium   |
| 6   | **No AI chat / RAG system** — users should be able to ask questions about their gym data    | 🟠 High     |
| 7   | **No audit log** — no record of who did what ("X created member Y", etc.)                   | 🟠 High     |
| 8   | **No media / animations on pages** — no images, videos, or animated elements                | 🟡 Medium   |

---

## 2 · Workstreams & Phases

Work is organized into **5 independent feature streams** (E through I) so they can be built in parallel or sequentially. Each phase follows the project's build → test → merge → next cadence.

### Feature E — UI Overhaul & Branding (4 phases)

The most visible work. Transforms the flat, generic interface into a premium, modern gym management dashboard.

---

#### Phase E0 · Branding & Metadata Rename

**Goal:** Purge every "Bootcamp Starter" reference and replace with gym-specific branding.

| Task                  | File(s)                               | Detail                                                                      |
| --------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| Root metadata         | `apps/web/app/layout.tsx` L13-14      | `title: 'GymFlow'`, `description: 'Modern gym management platform'`         |
| Sidebar logo text     | `components/app-sidebar.tsx` L147-149 | Change `Bootcamp Starter` → `GymFlow` + new icon (dumbbell/💪 instead of ✦) |
| Login hero text       | `app/login/page.tsx` L68-81           | Update logo, headline ("Manage your gym like a pro."), subtext              |
| Login footer          | `app/login/page.tsx` L159             | `© 2026 GymFlow`                                                            |
| Register page         | `app/register/page.tsx`               | Same branding treatment                                                     |
| Member portal sidebar | `components/member-sidebar.tsx`       | Update branding if "Bootcamp Starter" appears                               |
| Favicon               | `app/favicon.ico`                     | Generate new gym-themed favicon                                             |
| `<title>` per page    | All pages                             | Add descriptive `<title>` where missing                                     |

**Definition of Done:** No instance of "Bootcamp Starter" anywhere in `apps/web/`. Grep returns zero results.

---

#### Phase E1 · Design System Upgrade

**Goal:** Upgrade the visual foundation — glassmorphism, depth, gradients, shadows, and premium feel.

| Task                         | Detail                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Glass card utility**       | New CSS utility `.glass-card` with `backdrop-blur-xl`, subtle border gradient, slight background opacity. Used for stat cards, dialogs, panels. |
| **Gradient backgrounds**     | Sidebar gets a subtle dark gradient (`gray-900 → gray-800`). Main content area gets a faint mesh gradient background (CSS only, no images).     |
| **Shadow system**            | Replace flat `shadow-sm` with layered shadows (`shadow-[0_1px_3px_rgba(0,0,0,.04),0_8px_24px_rgba(0,0,0,.06)]`) for elevated cards.             |
| **Color accent refinements** | Add `--color-accent-gradient: linear-gradient(135deg, var(--primary-base), var(--primary-400))` for buttons, badges, sidebar active states.     |
| **Border treatments**        | Replace hard `border-gray-200` with softer `border-gray-200/60` + `ring-1 ring-gray-900/5` for glass effect.                                    |
| **Typography upgrade**       | Import Inter as a display font for headings (Manrope stays for body). Add `--font-display` token.                                               |
| **Button overhaul**          | Primary buttons get gradient + hover glow. Ghost buttons get subtle background on hover. Destructive buttons get proper red gradient.           |
| **Badge redesign**           | Status badges (Active, Expired, Cancelled, etc.) get pill shape with icon dots, colored backgrounds, no harsh borders.                          |
| **Table redesign**           | Tables get rounded corners, hover-row highlights, alternating subtle backgrounds, sticky headers.                                               |
| **Input refinement**         | Inputs get focus glow rings (`ring-2 ring-primary-base/20`), smooth transitions, better placeholder colors.                                     |

**Key files:**

- `apps/web/app/globals.css` — new tokens, utilities, glass utilities
- All page files — update className strings to use new design tokens

**Definition of Done:** Side-by-side before/after shows a clearly premium, modern interface. No flat white cards remain.

---

#### Phase E2 · Page-Specific UI Redesign

**Goal:** Redesign each major page with the new design system.

| Page                  | Redesign Notes                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**         | Glass stat cards with animated counters. Gradient header area with greeting + gym name. Better expiring-soon widget (see E3). Activity feed placeholder (filled by I2). |
| **Members list**      | Avatar circles, status dots (not text badges), inline search with animated icon, bulk action bar.                                                                       |
| **Member detail**     | Profile header with large avatar, gradient banner, subscription timeline visual.                                                                                        |
| **Plans**             | Card grid layout (not table), with price prominently displayed, gradient accent stripe per plan.                                                                        |
| **Sessions/Schedule** | Calendar-like visual with time blocks, color-coded by instructor, capacity progress bars.                                                                               |
| **Instructors**       | Profile cards with specialization tags, session count badge.                                                                                                            |
| **Check-ins**         | Real-time counter with animated number, recent check-in timeline with avatars.                                                                                          |
| **Settings**          | Tabbed layout with icon headers, theme picker integrated cleanly.                                                                                                       |
| **Login**             | Gym-themed hero image (generated), animated gradient background, glassmorphic form card.                                                                                |
| **Register**          | Same treatment as login, multi-step form feel.                                                                                                                          |

**Definition of Done:** Every authenticated page uses the new design system consistently.

---

#### Phase E3 · Expires Soon Widget Redesign

**Goal:** Replace the ugly "Expires Soon" card on the dashboard with a premium component.

**Current state:** Flat amber card with inline text list, basic "Show list" link (L247-313 of dashboard/page.tsx).

**New design:**

- Glass card with amber/orange gradient accent stripe on the left edge
- Animated count number (count-up animation on load)
- Mini progress ring showing percentage of total active subscriptions expiring
- Individual expiring items shown as compact member chips with:
  - Small avatar circle (initials)
  - Member name
  - Days-left pill badge: gradient red (≤7 days) or amber (8–30 days)
  - Hover: tooltip with plan name + exact date
- Expandable list (accordion-style, not dialog) for quick scanning
- "Renew All" batch action button (future-ready, disabled for now)

**Files:** `apps/web/app/(authenticated)/dashboard/page.tsx` — the `ExpiringSoonCard` and `ListDialog` components.

**Definition of Done:** The expiring-soon section looks premium and matches the new design language. No more flat amber rectangles.

---

### Feature F — Dark Mode (2 phases)

---

#### Phase F0 · Dark Mode Toggle Infrastructure

**Goal:** Add a user-facing dark mode toggle that persists preference.

| Task                  | Detail                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Toggle component**  | Moon/Sun icon button in the top navbar, animated icon swap                                            |
| **Persistence**       | Store preference in `localStorage` key `gym-theme-mode` (`'light'` / `'dark'` / `'system'`)           |
| **Root class toggle** | Add/remove `.dark` on `<html>` element. The CSS vars in `globals.css` already define `.dark {}` block |
| **System preference** | Default to `system` — use `matchMedia('(prefers-color-scheme: dark)')`                                |
| **Flash prevention**  | Inline `<script>` in `layout.tsx` `<head>` that reads localStorage and sets class before paint        |
| **Provider**          | Create `DarkModeProvider` context wrapping `RootLayout` children                                      |

**Key files:**

- `apps/web/app/layout.tsx` — flash-prevention script
- `apps/web/components/dark-mode-toggle.tsx` — new toggle component
- `apps/web/components/dark-mode-provider.tsx` — new context provider
- `apps/web/components/top-navbar.tsx` — add toggle to header
- `apps/web/hooks/use-dark-mode.ts` — new hook

**Definition of Done:** Clicking the toggle switches between light/dark modes instantly. Preference persists across page reloads. No flash of wrong theme on refresh.

---

#### Phase F1 · Dark Mode Audit & Polish

**Goal:** Ensure every component and page looks correct in dark mode.

| Task                       | Detail                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hardcoded colors audit** | Grep for `bg-white`, `text-gray-900`, `border-gray-200`, `bg-gray-50` etc. and replace with semantic tokens (`bg-card`, `text-foreground`, `border-border`, `bg-muted`) |
| **Sidebar dark mode**      | Uses semantic tokens already but verify gradient/glass effects work                                                                                                     |
| **Login/Register pages**   | Need separate dark treatment (dark background hero, glass form)                                                                                                         |
| **Charts/Dashboard**       | Verify chart colors use `--chart-*` vars that already have dark variants                                                                                                |
| **Dialogs/Modals**         | Verify `bg-popover` / `text-popover-foreground` usage                                                                                                                   |
| **Member portal**          | Audit all member-facing pages                                                                                                                                           |

**Definition of Done:** Complete dark mode pass — no white flashes, no illegible text, no broken contrast ratios. WCAG AA contrast minimum on all text.

---

### Feature G — Animations & Transitions (2 phases)

---

#### Phase G0 · Page Load Animations (Slack-style)

**Goal:** Add staggered entrance animations when pages load / when the user navigates.

| Task                              | Detail                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| **PageTransition wrapper**        | A `<PageTransition>` client component that wraps page content and applies CSS entrance animations |
| **Stagger animation system**      | CSS `@keyframes fadeSlideUp` with `animation-delay` based on child index (Slack-style)            |
| **Card entrance**                 | Dashboard cards, list items, table rows animate in with stagger                                   |
| **Sidebar animation**             | Sidebar nav items subtly slide in on first load                                                   |
| **Skeleton → content transition** | Smooth crossfade from skeleton loaders to real content                                            |
| **Route transitions**             | Fade between routes using Next.js layout-level animation                                          |

**Implementation approach:**

- CSS-only animations where possible (no heavy animation libraries)
- `animation-fill-mode: both` to prevent layout shift
- `prefers-reduced-motion` media query to disable for accessibility
- Animation duration: 300–500ms, delay step: 50–80ms per item

**Key CSS additions to `globals.css`:**

```css
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-stagger > * {
  animation: fadeSlideUp 0.4s ease-out both;
}
.animate-stagger > *:nth-child(1) {
  animation-delay: 0ms;
}
.animate-stagger > *:nth-child(2) {
  animation-delay: 60ms;
}
/* ... up to ~12 children */

@media (prefers-reduced-motion: reduce) {
  .animate-stagger > *,
  .animate-fade-in,
  .animate-scale-in {
    animation: none !important;
  }
}
```

**New components:**

- `apps/web/components/page-transition.tsx` — wraps page content
- `apps/web/components/animate-stagger.tsx` — container for staggered children

**Definition of Done:** Navigating between pages shows smooth Slack-style staggered animations. Dashboard cards pop in sequentially. Respects `prefers-reduced-motion`.

---

#### Phase G1 · Micro-Interactions & Media

**Goal:** Add hover effects, interactive elements, and media (images/videos) to pages.

| Task                         | Detail                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| **Button hover effects**     | Scale-up on hover (`transform: scale(1.02)`), subtle shadow expansion                |
| **Card hover**               | Lift effect on hover (translateY + shadow increase), subtle border glow              |
| **Sidebar active animation** | Active nav item has animated left-border indicator                                   |
| **Stat counter animation**   | Numbers on dashboard cards count up from 0 to value on load                          |
| **Avatar hover**             | Slight scale + ring glow on avatar hover                                             |
| **Toast animations**         | Custom entrance for toast notifications (slide-in from right)                        |
| **Empty state animations**   | Animated illustrations for empty lists                                               |
| **Login page**               | Animated gradient background, floating particle effects (CSS-only)                   |
| **Generated media**          | Use image generation for: gym hero image (login), empty-state illustrations, favicon |
| **Loading shimmer**          | Replace plain skeleton with shimmer animation (gradient sweep)                       |

**Definition of Done:** Every interactive element has a micro-interaction. Pages feel alive and responsive to user actions.

---

### Feature H — AI Chat / RAG System (4 phases)

---

#### Phase H0 · Contracts & API Foundation

**Goal:** Define the chat contracts, create the API module, and set up the LLM integration.

| Task                 | Detail                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Contracts**        | `packages/contracts/src/chat/chat-message.request.ts` — `{ message: string }` schema                                                  |
|                      | `packages/contracts/src/chat/chat-message.response.ts` — `{ reply: string, sources?: { type: string, id: string, title: string }[] }` |
| **API module**       | `apps/api/src/chat/chat.module.ts`, `chat.controller.ts`, `chat.service.ts`                                                           |
| **LLM integration**  | Use OpenAI API (or configurable provider via `CHAT_LLM_PROVIDER` / `CHAT_LLM_API_KEY` env vars)                                       |
| **Context builder**  | `chat.service.ts` builds gym-scoped context from DB: members, plans, subscriptions, sessions, check-ins, dashboard stats              |
| **Tenant isolation** | Chat queries are always scoped to the current user's `gymId` — the RAG context only includes data from their gym                      |
| **Rate limiting**    | Max 20 messages per minute per user (in-memory counter, upgrade to Redis later)                                                       |

**Endpoint:**

```
POST /chat/message
Body: { message: string }
Response: { reply: string, sources?: Source[] }
Auth: Requires authenticated user (ORG_ADMIN or MEMBER)
```

**RAG approach (no vector DB needed):**
Instead of a full vector-database RAG pipeline, we use **structured context injection**:

1. On each message, the service queries the gym's key data (member count, active subscriptions, upcoming sessions, recent check-ins, plan details)
2. This structured data is formatted as a system prompt context block
3. The user's question + context is sent to the LLM
4. The LLM responds with knowledge grounded in the gym's actual data

This is simpler than a vector store, works well for structured business data, and avoids adding infrastructure dependencies.

**Definition of Done:** `POST /chat/message` returns an AI-generated response grounded in the gym's real data. Swagger docs are complete.

---

#### Phase H1 · Chat UI — Floating Widget

**Goal:** Build a floating chat widget accessible from every authenticated page.

| Task                    | Detail                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| **Chat button**         | Floating action button (bottom-right), animated pulse, chat bubble icon                               |
| **Chat panel**          | Slide-up panel (not a full page), glass card design, max-height 60vh                                  |
| **Message list**        | Scrollable message area with user/AI message bubbles                                                  |
| **Input area**          | Text input + send button, Enter to send, Shift+Enter for newline                                      |
| **Typing indicator**    | Animated dots while waiting for AI response                                                           |
| **Message persistence** | Store chat history in component state (cleared on page reload — no backend persistence needed for v1) |
| **Markdown rendering**  | AI responses rendered as markdown (bold, lists, code blocks)                                          |
| **Source citations**    | If the AI response includes sources, show clickable links to the referenced gym data                  |

**Key files:**

- `apps/web/components/chat/chat-widget.tsx` — floating button + panel
- `apps/web/components/chat/chat-message.tsx` — individual message bubble
- `apps/web/components/chat/chat-input.tsx` — input area
- `apps/web/hooks/use-chat.ts` — SWR mutation hook for sending messages
- `apps/web/app/(authenticated)/layout.tsx` — mount the widget

**Definition of Done:** Chat widget is accessible from all authenticated pages. Messages are sent, AI responds with gym-specific answers.

---

#### Phase H2 · Smart Suggestions & Polish

**Goal:** Add pre-built question suggestions and improve the chat experience.

| Task                  | Detail                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quick suggestions** | Show 3–4 suggested questions when chat opens: "How many active members?", "Show expiring subscriptions", "What's today's schedule?", "Revenue this month?" |
| **Context awareness** | If user is on the Members page, suggest member-related questions. If on Dashboard, suggest dashboard questions.                                            |
| **Error handling**    | Graceful fallback if LLM API is unavailable ("I'm having trouble connecting. Try again in a moment.")                                                      |
| **Animations**        | Message bubbles animate in (slide-up). Panel slides up/down smoothly.                                                                                      |
| **Empty state**       | First-open state with gym assistant avatar, welcome message, and suggestions                                                                               |

**Definition of Done:** Chat is polished, contextually aware, and handles edge cases gracefully.

---

#### Phase H3 · Member Portal Chat

**Goal:** Extend the chat to the member portal with member-appropriate context.

| Task                       | Detail                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **Member context**         | Members see their own subscriptions, bookings, check-in history                         |
| **Scoped questions**       | "When does my subscription expire?", "What sessions can I book?", "My check-in history" |
| **Role-based context**     | ORG_ADMIN gets full gym data, MEMBER gets only their own data                           |
| **Mount in member layout** | Add chat widget to `app/(member)/layout.tsx`                                            |

**Definition of Done:** Both admin and member users can use the chat, with data scoped to their role.

---

### Feature I — Audit Log (3 phases)

---

#### Phase I0 · Database & API

**Goal:** Add an audit log table and API endpoints.

> ⚠️ **Schema freeze exception:** This feature requires a new `AuditLog` model. This is a post-launch enhancement (not part of A/B/C feature workstreams) so a new migration is permitted.

**New Prisma model:**

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  gymId      String?  // null for platform-level actions (SUPER_ADMIN)
  userId     String   // who performed the action
  userName   String   // denormalized for display (user name at time of action)
  action     String   // e.g. 'member.created', 'subscription.cancelled', 'session.updated'
  entityType String   // e.g. 'Member', 'Subscription', 'GymSession'
  entityId   String   // UUID of the affected entity
  entityName String?  // human-readable label (e.g. member name, session title)
  metadata   Json?    // optional structured diff (old/new values)
  ipAddress  String?  // request IP for security audits
  createdAt  DateTime @default(now())

  @@index([gymId])
  @@index([userId])
  @@index([entityType])
  @@index([createdAt])
  @@schema("public")
}
```

**API endpoints:**

```
GET  /audit-logs?page=1&limit=20&entityType=Member&action=member.created&startDate=...&endDate=...
     → Paginated list, scoped by gymId for ORG_ADMIN, all for SUPER_ADMIN
```

**Audit service pattern:**

```ts
// apps/api/src/audit/audit.service.ts
class AuditService {
  /** Log an auditable action performed by a user */
  async log(params: {
    gymId?: string;
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void>;

  /** List audit logs with filtering and pagination, scoped to gym */
  async list(
    gymId: string | null,
    filters: AuditLogFilters,
  ): Promise<PaginatedResult<AuditLog>>;
}
```

**Integration points — inject audit logging into existing services:**

| Service                    | Actions to log                                                                    |
| -------------------------- | --------------------------------------------------------------------------------- |
| `members.service.ts`       | `member.created`, `member.updated`, `member.deactivated`, `member.portal-invited` |
| `plans.service.ts`         | `plan.created`, `plan.updated`, `plan.deactivated`                                |
| `subscriptions.service.ts` | `subscription.created`, `subscription.cancelled`                                  |
| `sessions.service.ts`      | `session.created`, `session.updated`, `session.cancelled`, `session.completed`    |
| `bookings.service.ts`      | `booking.created`, `booking.cancelled`, `booking.checked-in`                      |
| `checkins.service.ts`      | `checkin.created`, `checkin.checked-out`                                          |
| `gyms.service.ts`          | `gym.approved`, `gym.rejected`, `gym.suspended`, `gym.settings-updated`           |
| `instructors.service.ts`   | `instructor.created`, `instructor.updated`, `instructor.deactivated`              |

**Definition of Done:** All existing CRUD operations emit audit log entries. `GET /audit-logs` returns paginated, filtered results with Swagger docs.

---

#### Phase I1 · Audit Log UI (Admin)

**Goal:** Build an audit log page for ORG_ADMIN users.

| Task                    | Detail                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **New route**           | `app/(authenticated)/audit-log/page.tsx`                                                                                              |
| **Sidebar link**        | Add "Activity Log" with `ScrollText` icon to `app-sidebar.tsx` (after Check-ins)                                                      |
| **Timeline UI**         | Vertical timeline design (like GitHub activity feed), each entry shows: avatar, user name, action description, entity link, timestamp |
| **Filters**             | Filter by: entity type (dropdown), action (dropdown), date range (date pickers), user (search)                                        |
| **Pagination**          | Server-side pagination with page controls                                                                                             |
| **Action descriptions** | Human-readable: "**John Smith** created member **Jane Doe**" with entity name linked to detail page                                   |
| **Relative timestamps** | "2 minutes ago", "Yesterday at 3:45 PM" — with tooltip showing absolute time                                                          |
| **Empty state**         | Animated illustration with "No activity yet" message                                                                                  |

**Definition of Done:** ORG_ADMIN can view a filterable, paginated audit log of all actions in their gym.

---

#### Phase I2 · Dashboard Activity Feed

**Goal:** Add a "Recent Activity" widget to the dashboard.

| Task                   | Detail                                                                      |
| ---------------------- | --------------------------------------------------------------------------- |
| **Activity feed card** | Shows last 5–10 audit log entries on the dashboard, compact timeline format |
| **"View all" link**    | Links to full audit log page                                                |
| **Animations**         | New entries animate in (stagger effect from Feature G)                      |

**Definition of Done:** Dashboard has a live activity feed showing recent actions.

---

## 3 · Dependency Graph

```
E0 (Branding) ──→ E1 (Design System) ──→ E2 (Page Redesign) ──→ E3 (Expires Widget)
                                    ↘
F0 (Dark Mode Toggle) ──→ F1 (Dark Mode Audit)   ← must happen after E1 tokens are set

G0 (Page Animations) ──→ G1 (Micro-interactions)  ← can run parallel with E/F

H0 (Chat API) ──→ H1 (Chat UI) ──→ H2 (Polish) ──→ H3 (Member Portal Chat)

I0 (Audit DB+API) ──→ I1 (Audit UI) ──→ I2 (Dashboard Widget)
```

**Recommended build order:**

1. **E0** → quick branding fix (< 1 hour)
2. **E1** → design system foundation (prerequisite for all visual work)
3. **G0** → page animations (independent of page content)
4. **F0** → dark mode toggle (needs E1 tokens)
5. **E2** → page redesigns (biggest phase — apply new design system everywhere)
6. **I0** → audit log backend (independent of UI work)
7. **E3** → expires widget (part of dashboard redesign)
8. **F1** → dark mode audit (after E2 pages are final)
9. **G1** → micro-interactions (after pages are designed)
10. **H0** → chat backend
11. **I1** → audit log UI
12. **H1** → chat widget
13. **I2** → dashboard activity feed
14. **H2** → chat polish
15. **H3** → member portal chat

---

## 4 · Technical Decisions

### AI Chat — Why Not a Vector Database?

A full RAG system with embeddings + vector store (Pinecone, pgvector, etc.) is overkill for structured business data. Our gym data is:

- **Structured** (SQL tables with known schemas)
- **Small per tenant** (hundreds to low thousands of records)
- **Queryable** (we can aggregate counts, filter by date, etc.)

Instead, we use **structured context injection**: query the relevant DB tables, format the results as a text context block, and send it as part of the LLM prompt. This gives us:

- Zero additional infrastructure
- Guaranteed freshness (queries run at request time)
- Tenant isolation (queries are `WHERE gymId = ...`)
- Deterministic grounding (no hallucination about data we control)

### Dark Mode — Why Not next-themes?

`next-themes` is a popular library, but:

- We already have `.dark` CSS variables defined in `globals.css`
- Our `ThemeProvider` already exists for gym brand colors
- A simple `localStorage` + class toggle is ~30 lines of code
- No additional dependency needed

### Animations — Why CSS-Only?

Framer Motion adds ~30KB to the bundle and is overkill for entrance animations. CSS `@keyframes` + `animation-delay` achieves the Slack-style stagger effect with:

- Zero JavaScript overhead
- Automatic `prefers-reduced-motion` support
- Better performance (GPU-accelerated transforms)
- No dependency

If more complex orchestrated animations are needed later, we can add Framer Motion selectively.

### Audit Log — Why Denormalized User Name?

The `userName` field is denormalized (stored at log time) because:

- Users can change their name later; the log should show who they were at the time
- It avoids a JOIN on every audit log query
- It's a write-once, read-many pattern (perfect for denormalization)

---

## 5 · Environment Variables (New)

| Variable                  | Required               | Default       | Used By    |
| ------------------------- | ---------------------- | ------------- | ---------- |
| `CHAT_LLM_PROVIDER`       | No                     | `openai`      | `apps/api` |
| `CHAT_LLM_API_KEY`        | Yes (for chat feature) | —             | `apps/api` |
| `CHAT_LLM_MODEL`          | No                     | `gpt-4o-mini` | `apps/api` |
| `CHAT_MAX_CONTEXT_TOKENS` | No                     | `4000`        | `apps/api` |

---

## 6 · Files Affected (Summary)

### New files

| File                                              | Feature |
| ------------------------------------------------- | ------- |
| `packages/contracts/src/chat/*`                   | H       |
| `packages/contracts/src/audit-log/*`              | I       |
| `apps/api/src/chat/*`                             | H       |
| `apps/api/src/audit/*`                            | I       |
| `apps/web/components/chat/*`                      | H       |
| `apps/web/components/dark-mode-toggle.tsx`        | F       |
| `apps/web/components/dark-mode-provider.tsx`      | F       |
| `apps/web/components/page-transition.tsx`         | G       |
| `apps/web/components/animate-stagger.tsx`         | G       |
| `apps/web/components/animated-counter.tsx`        | G       |
| `apps/web/hooks/use-chat.ts`                      | H       |
| `apps/web/hooks/use-audit-logs.ts`                | I       |
| `apps/web/hooks/use-dark-mode.ts`                 | F       |
| `apps/web/app/(authenticated)/audit-log/page.tsx` | I       |
| `docs/progress/PROGRESS-E.md`                     | E       |
| `docs/progress/PROGRESS-F.md`                     | F       |
| `docs/progress/PROGRESS-G.md`                     | G       |
| `docs/progress/PROGRESS-H.md`                     | H       |
| `docs/progress/PROGRESS-I.md`                     | I       |

### Modified files

| File                                                  | Feature(s)          |
| ----------------------------------------------------- | ------------------- |
| `apps/web/app/globals.css`                            | E, F, G             |
| `apps/web/app/layout.tsx`                             | E, F                |
| `apps/web/app/(authenticated)/layout.tsx`             | G, H                |
| `apps/web/components/app-sidebar.tsx`                 | E, I                |
| `apps/web/components/top-navbar.tsx`                  | F                   |
| `apps/web/components/member-sidebar.tsx`              | E                   |
| `apps/web/app/login/page.tsx`                         | E                   |
| `apps/web/app/register/page.tsx`                      | E                   |
| `apps/web/app/(authenticated)/dashboard/page.tsx`     | E, I                |
| `apps/web/app/(authenticated)/members/page.tsx`       | E                   |
| `apps/web/app/(authenticated)/plans/page.tsx`         | E                   |
| `apps/web/app/(authenticated)/sessions/page.tsx`      | E                   |
| `apps/web/app/(authenticated)/instructors/page.tsx`   | E                   |
| `apps/web/app/(authenticated)/checkins/*`             | E                   |
| `apps/web/app/(authenticated)/settings/page.tsx`      | E                   |
| `apps/api/src/app.module.ts`                          | H, I                |
| `apps/api/src/main.ts`                                | H, I (Swagger tags) |
| `apps/api/src/members/members.service.ts`             | I (audit calls)     |
| `apps/api/src/plans/plans.service.ts`                 | I (audit calls)     |
| `apps/api/src/subscriptions/subscriptions.service.ts` | I (audit calls)     |
| `apps/api/src/sessions/sessions.service.ts`           | I (audit calls)     |
| `apps/api/src/bookings/bookings.service.ts`           | I (audit calls)     |
| `apps/api/src/checkins/checkins.service.ts`           | I (audit calls)     |
| `apps/api/src/gyms/gyms.service.ts`                   | I (audit calls)     |
| `apps/api/src/instructors/instructors.service.ts`     | I (audit calls)     |
| `packages/database/prisma/schema.prisma`              | I (AuditLog model)  |

---

## 7 · Estimation

| Feature                    | Phases | Estimated Effort           |
| -------------------------- | ------ | -------------------------- |
| E — UI Overhaul & Branding | 4      | Large (biggest workstream) |
| F — Dark Mode              | 2      | Small–Medium               |
| G — Animations             | 2      | Medium                     |
| H — AI Chat / RAG          | 4      | Medium–Large               |
| I — Audit Log              | 3      | Medium                     |

**Total phases:** 15  
**Critical path:** E0 → E1 → E2 → E3 (all visual work depends on the design system)

---

## 8 · What This Plan Does NOT Cover

- Payment/billing integration (Stripe)
- Push notifications / real-time WebSocket
- Mobile app
- Multi-language (i18n)
- File uploads (profile pictures)
- Reporting/analytics CSV export

These are out of scope for this enhancement round.
