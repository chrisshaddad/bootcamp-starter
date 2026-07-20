# MediLink Login & Theme Redesign

Branch: `medilink-login-theme-redesign`

Replaces MediLink's leftover green/yellow "bootcamp starter" branding with a
blue theme, rebuilds the login page around a real hospital photo, adds a
light/dark mode toggle, the first slice of per-institution dynamic branding,
and a round of navbar/dark-mode visual polish. See also
[`medilink-remodel.md`](./medilink-remodel.md) and
[`medilink-flows-1-5.md`](./medilink-flows-1-5.md) for earlier phases.

## What changed, at a glance

| Area | Before | After |
| --- | --- | --- |
| Theme | Green/yellow "bootcamp starter" color tokens | Blue primary theme; secondary demoted to a neutral slate scale |
| Dark mode | Hardcoded Tailwind grays (`bg-white`, `text-gray-900`, …) across authenticated pages | Semantic shadcn tokens (`bg-background`, `text-foreground`, `border-border`, …) so `.dark` renders correctly everywhere |
| Dark mode sidebar/cards | Sidebar background matched cards/popovers; `shadow-sm` on cards | Sidebar background darkened a step for more depth; cards use `shadow-md` |
| Login page | Stock Unsplash photo + "Bootcamp Starter" wordmark; toast + form reset on submit | Real hospital photo + gradient overlay (both themes); inline "Check your email" confirmation screen |
| Sidebar branding | Always read "MediLink" | Super Admin still sees "MediLink"; every other role sees their own institution's name |
| Top navbar | Static header with a search box | `sticky top-0` (stays visible on scroll); search box removed (it had no real search behind it) |

## Design decisions worth knowing

- **Theme is entirely CSS custom properties.** `apps/web/app/globals.css`'s `@theme inline` block defines every color; there is no `tailwind.config.js`. Changing a hex value there re-themes every consuming Tailwind utility class app-wide.
- **The dark-mode pass touched far more files than the palette change alone would require** — most authenticated pages had hardcoded literal grays that don't respond to `.dark` at all; those were replaced with semantic tokens so dark mode actually works app-wide.
- **Success alert color was retuned after the initial rollout**, from cyan (`#0891b2`) to green (`#10a37f`) — cyan didn't read clearly as "success" next to the new blue primary.
- **Magic-link UX moved from toast to an inline confirmation state** — a clearer terminal state for a passwordless flow with no separate confirmation page.
- **Sidebar branding is dynamic per institution** — name-only first slice of dynamic branding (Super Admin keeps "MediLink"; everyone else sees their institution's name via `useMyInstitution`). Logo upload and a "powered by MediLink" demotion are not part of this.
- **`StatusBadge`'s `SUSPENDED` style was corrected** to the new neutral secondary palette.
- **Sidebar dark-mode background** (`--sidebar` in `globals.css`) went from `#1f2937` (same as cards/popovers) to `#182130` — a subtle step darker so the sidebar reads as its own surface instead of blending with elevated cards.
- **Card shadow** bumped from `shadow-sm` to `shadow-md` app-wide (`components/ui/card.tsx`) for more visible depth in both themes.
- **Top navbar search box was removed**, not fixed — it never had any real search behavior wired to it (`useState` for the query, no filtering, no API call). Removing a fake control is better than leaving a "basically useless" one in place.
- **Top navbar is now `sticky top-0 z-20`** — the authenticated layout's content area shares one scroll container with the navbar (no separate `overflow-y-auto` wrapper), so a plain `sticky` was sufficient; no `position: fixed` + padding compensation needed.

## QA steps

1. Load `/login` in both light and dark mode — check the hero photo, gradient overlay, and wordmark against each theme.
2. Submit the magic-link form — confirm the "Check your email" screen appears (not a toast), and "Use a different email" returns to a clean form.
3. Toggle light/dark from the top navbar across a few authenticated pages (dashboard, institutions, patients) — confirm no leftover hardcoded grays break contrast in dark mode.
4. In dark mode, compare the sidebar background against a card — the sidebar should read visibly darker, not identical.
5. Look at any card (e.g. a dashboard stat tile) in both themes — shadow should be a bit more visible than a bare `shadow-sm` would give.
6. Log in as Super Admin — sidebar header reads "MediLink". Log in as an Institution Admin/Staff/Professional/Patient — sidebar header reads that institution's name instead.
7. Scroll down any authenticated page with enough content — the top navbar (search icon removed, theme toggle, bell, avatar menu) should stay pinned at the top instead of scrolling away.
8. Confirm there's no search input box in the top navbar at all anymore.

## Still missing / follow-up

- The dedicated "My Institution" page is still hard-gated to `INSTITUTION_ADMIN`; a Patient sees their institution's name in the sidebar but has no page to view a full institution profile.
- Institution logo upload and user avatars are still not built — avatars are explicitly cancelled (no preview capability); institution logo upload remains an open, undecided question.
- No color/contrast accessibility audit has been run against the new blue theme in either light or dark mode.
