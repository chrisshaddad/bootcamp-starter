# Feature D — Gym theme customization (Owner: unassigned) · Progress

> Part of the gym progress log. Overview/index: [`../PROGRESS.md`](../PROGRESS.md) ·
> Plan: [`../gym-management-plan.md`](../gym-management-plan.md) (see "Feature D").
>
> **Edit only this file for Feature D work** (avoids cross-feature merge conflicts).
> Build phases in order: build → test → merge → next. Don't start a phase until the
> previous is ✅. Status legend: ⬜ Not started · 🟡 In progress · ✅ Done · 🚧 Blocked.

**Owner:** Claude · **Status: 4 / 4 done — ✅ Complete.**

Post-launch addition, built after Features A/B/C were merged — the schema
freeze that applied during the parallel A/B/C build no longer applies, so D0
is allowed to make one additive migration.

| Phase | Scope                                                                                         | Dev    | Status | Date       | Notes / PR                                                                                                                                                                                                |
| ----- | --------------------------------------------------------------------------------------------- | ------ | ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D0    | Schema: `Gym.themeColor` (nullable hex) + migration                                           | Claude | ✅     | 2026-07-10 | Migration `20260710145919_add_gym_theme_color`; `docs/schema-overview.md` updated                                                                                                                         |
| D1    | Contracts + API: `PATCH /gyms/settings` (+themeColor), `/auth/me` returns `gymThemeColor`     | Claude | ✅     | 2026-07-10 | `gym-settings-update.request.ts` also folded in `maxCapacity`, fixing its prior inline-DTO gap; verified end-to-end via magic-link login (ORG_ADMIN 200, MEMBER 403, invalid hex 400)                     |
| D2    | Web: theme engine (`lib/theme/*`), `ThemeProvider`, `ThemePicker`, Settings "Appearance" card | Claude | ✅     | 2026-07-10 | `lib/theme/color-utils.ts` + `apply-theme.ts`, `ThemeProvider` mounted in both layouts, `ThemePicker` on `/settings` (ORG_ADMIN only); also swapped 3 hardcoded `blue-600` action links to `text-primary` |
| D3    | Edge cases, accessibility, dark-mode + cross-tenant QA pass                                   | Claude | ✅     | 2026-07-10 | API-level QA + 3 rounds of user-driven browser QA, each surfacing and fixing a real bug (see Decisions & deviations below); user confirmed working                                                        |

## Scope, locked in before D0 (see plan for full rationale)

- **Reach:** whole gym — both `(authenticated)` admin/staff shell and
  `(member)` portal shell re-theme. `SUPER_ADMIN` is never themed.
- **Persistence:** database (`Gym.themeColor`), not `localStorage` — must
  survive across devices/staff and reach the member portal.
- **Recolors only** the primary/accent/ring/sidebar/chart-1 token group.
  `success`/`warning`/`error`/`destructive`/`secondary` stay fixed.
- **12 presets live in `globals.css`** as `--theme-preset-*` vars (not
  hardcoded in TS/TSX); only a custom color's derived ramp is computed at
  runtime, and even then it's written through the same CSS variable names
  `globals.css` already declares.
- One resolved **hex** is stored (not a preset id) — re-tuning a preset later
  never silently reflows a gym that already picked it.

## Decisions & deviations

- D1: `themeColor` was added to the **existing** `PATCH /gyms/settings`
  endpoint (one settings endpoint, one contract) rather than a new dedicated
  `/gyms/theme` route — confirmed with the user. While touching that
  controller, `maxCapacity` was moved off its old inline `{ maxCapacity:
number | null }` TS type onto the new shared `gymSettingsUpdateRequestSchema`
  contract, fixing a pre-existing AGENTS.md "no inline DTO" violation on that
  endpoint at the same time.
- D1: hex validated with `/^#[0-9A-Fa-f]{6}$/` in the contract (client + server
  both get the same regex via Zod); confirmed 400 on an invalid value like
  `"blue"`.
- D2: foreground text color (`primary-foreground` etc.) is picked by strict
  WCAG contrast (whichever of white / `#111827` contrasts better), not a
  fixed "always white" rule. This means picking the **Green** preset
  (matching the site's literal default hex `#27a376`) computes near-black
  text (5.57:1) instead of the default's actual white (3.18:1, itself
  sub-AA) — a deliberate trade-off: the general algorithm needs to get
  arbitrary custom colors (e.g. Amber) right, and it does (picks black text,
  8.32:1, over white's 2.13:1). Only matters if an admin explicitly
  re-selects Green after using another color; a gym that never touches the
  picker is unaffected (`themeColor: null` never invokes this function).
- D2: `useGymTheme` (in `hooks/use-gym-theme.ts`) reuses the same
  `PATCH /gyms/settings` endpoint as `useUpdateGymSettings` in
  `hooks/use-dashboard.ts` (Feature C's capacity-setting hook), kept as two
  separate hooks per feature-ownership convention rather than merging them,
  even though they hit the same route.
- D2: 12 preset **swatch buttons** render their background via
  `style={{ backgroundColor: 'var(--theme-preset-x)' }}` (CSS resolves it, no
  JS read needed for display); the actual hex string (needed for the
  selected-state check and for preview/save) is resolved via
  `getComputedStyle` **once in a `useEffect` on mount** and cached in state
  — see bug #5 below, which corrected an earlier version of this that called
  `getComputedStyle` during render/on every click instead.
- D3: full round-trip QA was run against the live dev servers + seeded data
  via `curl` (magic-link login flow through Mailpit): confirmed (a) Iron
  Peak's `ORG_ADMIN` setting a theme is visible to Iron Peak's `MEMBER` via
  `/auth/me`, (b) FlexZone's `ORG_ADMIN` still sees `gymThemeColor: null`
  (tenant isolation), (c) `SUPER_ADMIN` always gets `gymThemeColor: null`
  and gets 403 from `PATCH /gyms/settings`, (d) invalid hex → 400, (e)
  `themeColor: null` reset round-trips correctly. **Not verified:** the
  actual browser rendering (live preview flicker, swatch selected-state
  ring, dark-mode contrast, toast appearance) — no browser automation tool
  was available in this environment and the user opted to check this
  manually rather than have Playwright installed. `npx turbo run lint
check-types` and `npm run format:check` all pass.
- **D3 bug found + fixed (post-handoff):** the user reported buttons/icons/
  member-portal branding staying green after picking a color. Root cause:
  `globals.css`'s `@theme inline` block defined the Humanline design-system
  ramp (`--color-primary-base`, `--color-primary-400/300/200/100` — the
  tokens behind `bg-primary-base`, `text-primary-400`, etc., used in ~19
  files including both sidebars, the top navbar, and every member-portal
  page) as **literal hex**, not `var(...)` references, unlike the shadcn
  tokens (`--color-primary: var(--primary)`). Tailwind v4 bakes literal
  `@theme` values directly into the compiled utility CSS with no variable
  indirection, so Feature D's runtime `<style>` override had zero effect on
  any element using those classes — only the shadcn `bg-primary`/`text-primary`
  utilities (a small minority of the app) actually re-themed. Confirmed via
  the compiled CSS before/after (`.bg-primary-base { background-color:
#27a376 }` → `{ background-color: var(--primary-base) }`).
  **Fix:** added real `:root`-level custom properties (`--primary-base:
var(--primary)` — a straight alias, so there's one source of truth — and
  `--primary-400/300/200/100` holding the default tint values), then pointed
  `@theme inline`'s `--color-primary-*` entries at those via `var(...)`,
  mirroring the exact pattern the shadcn tokens already used. Renamed
  `ThemeTokens`' keys in `lib/theme/color-utils.ts` from `color-primary-*` to
  `primary-*` to match. **Zero component files needed to change** — the fix
  is entirely in `globals.css`, so every one of the ~19 consumers (both
  sidebars, top navbar, all member-portal pages, dashboard, members, plans,
  sessions, etc.) is fixed at once. Re-verified against the live-compiled
  Turbopack CSS output that `.bg-primary-base`, `.text-primary-base`,
  `.bg-primary-400`, `.bg-primary-100`, and their `/opacity` and `hover:`
  variants all now resolve through the variable (incl. `color-mix()` for
  opacity modifiers). Deliberately **left alone**: `bg-green-*`/`bg-emerald-*`
  usages (status/"active"/"checked-in" indicators — semantic meaning, not
  brand, same reasoning as leaving `success`/`destructive` fixed) and the
  "Additional Colors" tokens (`--color-orange/blue/purple`, unrelated
  decorative accents). Full QA round-trip (Iron Peak → pink, `/auth/me`
  reflects it, reset to default) re-run after the fix; lint/check-types/
  format all still pass. **Browser visual confirmation is still outstanding**
  — this fix was verified via compiled-CSS inspection, not a real render.

- **D3 bug #2 found + fixed:** after bug #1's fix, the user correctly flagged
  a UX/semantics regression: picking a **red** brand color made the "Active"
  status badge (members, subscriptions, sessions, bookings, plans,
  instructors) turn red too — visually colliding with the fixed-red
  "Cancelled" badge. Root cause: **9 files** (`members/page.tsx`,
  `members/[id]/page.tsx`, `members/[id]/subscriptions-panel.tsx`,
  `plans/page.tsx`, `instructors/page.tsx`, `sessions/page.tsx`,
  `sessions/[id]/page.tsx` ×2 spots, `(member)/portal/page.tsx`,
  `(member)/portal/subscriptions/page.tsx`, `(member)/portal/profile/page.tsx`,
  `(member)/portal/bookings/page.tsx`) used `bg-primary-100 text-primary-base`
  (the brand token) to color "positive" status badges (`ACTIVE`, `BOOKED`,
  `SCHEDULED`, active plan/instructor), a pre-existing conflation of "brand
  color" with "positive status color" that was invisible while primary was
  always green and became a real bug the moment primary became configurable.
  **Correct UX principle (confirmed):** status/semantic colors must stay
  fixed regardless of brand theme — they communicate state (active vs.
  cancelled vs. expired), not brand identity; only interactive/decorative
  brand surfaces (buttons, links, nav highlighting, avatars, icons) should
  follow the chosen color. This is the same reasoning already applied to
  `destructive`/`warning` in the original design. **Fix:** switched all 12
  "positive status" spots (11 originally found + 1 more, `bg-primary-50`, in
  a bookings list on `sessions/[id]/page.tsx`, found on a follow-up sweep)
  from `bg-primary-100 text-primary-base` to `bg-success/10 text-success`
  (`border-primary-200` → `border-success/20` where a border was present),
  using the `--color-success` token that already existed in `globals.css`
  (literal `#0caf60`, never touched by the theme engine) but was previously
  unused. Verified via compiled CSS that `.text-success`/`.bg-success\/10`/
  `.border-success\/20` all compile to the fixed literal, independent of
  `--primary`. **Deliberately left alone** (genuinely brand/interactive, not
  status): sidebar active-nav highlighting, outline-button hover states,
  decorative avatar/card backgrounds, the dashboard capacity-gauge icon
  (already correctly red/amber/brand by threshold). Re-ran lint/check-types/
  format — all pass.

- **D3 bug #3 found + fixed:** the user reported some inputs' focus ring
  still showing the original color after changing the theme. Root cause:
  `components/ui/input.tsx` (the shared shadcn `Input` — used for nearly
  every text field in the app) had `focus-visible:border-success
focus-visible:ring-success/20` instead of the standard shadcn
  `focus-visible:border-ring focus-visible:ring-ring/50` pattern that every
  other primitive (`Textarea`, `Select`, `Button`) already correctly uses.
  This is a **pre-existing bug independent of Feature D** — someone had
  mis-wired `Input`'s focus state to the fixed `success` token instead of
  `ring` at some earlier point, invisible only because `success` and
  `primary`/`ring` happened to be the same green by coincidence in the
  default theme. Fixed by changing that one class string to match the
  standard pattern (`border-ring`/`ring-ring/50`), verified against compiled
  CSS (`--tw-ring-color: var(--ring)`). This is the one exception to "don't
  hand-edit `components/ui/`" in `AGENTS.md` in this feature — it's a
  1-line correctness fix restoring the standard shadcn pattern, not a
  design change, and re-running `shadcn add input` would've clobbered this
  repo's intentional Humanline sizing/spacing customizations on the same
  file. Checked `Textarea`/`Select` and all other `focus-visible:ring-*`
  usages app-wide — everything else was already correctly wired to
  `ring`/`primary-base` (both theme-reactive since bug #1's fix). Re-ran
  lint/check-types/format — all pass.

- **D3 bug #4 found + fixed (CodeRabbit PR review):** dark-mode
  `accent-foreground` was hardcoded to `'#ffffff'` instead of using
  `pickForeground(darkAccentHex)` like `primary-foreground` already does.
  For lighter/warmer seed colors (orange, amber, lime, teal) `darkAccent()`
  only drops lightness by 6 points, leaving a medium-lightness color where
  white text scores 2.28–2.95:1 contrast — well under WCAG AA. **Audit while
  fixing this also found a worse, pre-existing instance of the same bug**:
  dark-mode `sidebar-accent-foreground` used `base400` (a light tint of the
  hue) as text on `darkAccentHex`, giving 1.48–1.77:1 contrast — including
  for the **default green theme itself** (1.77:1), not just custom colors.
  That pairing was never `#ffffff`-vs-dark, so CodeRabbit's comment didn't
  catch it directly, but it's the exact same root cause. This was a
  self-inflicted regression: the original (pre-Feature-D) dark sidebar used
  a neutral gray background with tinted text (5.36:1, safe); the deviation
  logged in bug #1 above ("brand `sidebar-accent` for consistency") swapped
  in a saturated background without re-deriving a matching foreground.
  **Fix:** compute `darkAccentForeground = pickForeground(darkAccentHex)`
  once and use it for both `accent-foreground` and `sidebar-accent-foreground`
  in the dark token set. Verified across 7 presets: contrast now ranges
  4.32–7.78:1 (was 1.48–2.95:1). `lint`/`check-types`/`format:check` pass.

- **D3 bug #5 found + fixed (CodeRabbit PR review):** `theme-picker.tsx`
  called `getPresetHex()` (a `getComputedStyle(document.documentElement)`
  read) directly inside the `THEME_PRESETS.map()` in the JSX — twice per
  preset (once for the selected-ring class, once for the check-icon
  condition), so 24 DOM reads every render. Reading `document` during render
  is also unsafe if this component is ever server-rendered. **Fix:** resolve
  all 12 preset hexes once in a `useEffect` on mount into a `presetHexes`
  state map, and read from that in both the JSX and `handlePresetClick`
  (which previously also called `getPresetHex()` again on every click). The
  swatch background itself was already fine (`style={{ backgroundColor:
'var(...)' }}`, pure CSS, no JS read) — only the "is this preset selected"
  comparison needed caching. `lint`/`check-types`/`format:check` pass.

## Notes for the next agent

**Feature D is complete — all 4 phases ✅.** D0-D2 built the feature; D3's
API-level QA passed immediately, and five real bugs surfaced across multiple
rounds of user + CodeRabbit review — each found, root caused, and fixed (see
the five D3 bug entries above). If you're touching this area later:

- Any new brand-ramp token in `globals.css` must be a `var(...)` reference,
  never a literal, or the runtime theme override can't reach it (bug #1).
- New "positive/good" status badges must use `bg-success/10 text-success`,
  never `bg-primary-*` — status color communicates state, not brand (bug #2).
- Shared form primitives' focus states must use `border-ring`/`ring-ring`,
  matching `Button`/`Textarea`/`Select` (bug #3).
- Any foreground/text token paired with a computed background must go
  through `pickForeground()`, never a hardcoded or unrelated tint — this bit
  us twice in the same dark-mode accent pairing (bug #4).
- Never call `getComputedStyle()`/read `document` directly inside JSX render
  — resolve once in a `useEffect` and read from state, as `theme-picker.tsx`
  now does for `presetHexes` (bug #5).

Full detail in [`../gym-management-plan.md`](../gym-management-plan.md)
"Feature D" for the original design; this file's Decisions & deviations
section above has the complete bug/fix history.
