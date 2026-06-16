# Margin — Visual System

Purple-on-dark design system for the Margin prototype. Mirrors the real app's Tailwind v4
`@theme inline` token structure so components transfer. **Dark mode only.** The implemented source of
truth is [`app/globals.css`](../app/globals.css); this doc explains the intent and the accessibility
checks.

## Mood

Premium fintech/analytics. A confident violet brand color (`#7C4DFF`) over a deep near-black canvas with
a subtle cool/violet undertone (`#0B0A12`), layered surfaces for depth, and a single cyan accent
(`#22D3EE`) reserved for highlights, links, and the second data series in charts. Restrained, not neon.

## Core colors

| Token              | Hex       | Use for                                                        |
| ------------------ | --------- | ------------------------------------------------------------- |
| `primary-base`     | `#7C4DFF` | Brand. Primary buttons, active nav, focus ring, chart-1.      |
| `primary-600/700`  | `#6A3DF0` / `#5B30D6` | Primary button hover / pressed.                   |
| `primary-400/300/200/100` | `#936BFF`→`#EBE5FF` | Lighter violet accents, gradients, on-dark text highlights. |
| `primary-soft`     | `#17132B` | Faint violet surface for selected/active rows on dark.        |
| `accent-base`      | `#22D3EE` | Cyan highlights, links, secondary data series (chart-2).      |
| `background`       | `#0B0A12` | App canvas.                                                   |
| `card`             | `#16141F` | Cards, panels, raised surfaces (one step above canvas).      |
| `popover`          | `#1A1726` | Menus, dialogs, dropdowns.                                    |
| `secondary`        | `#221F30` | Low-emphasis (secondary/ghost) button surfaces.              |
| `muted`            | `#1C1A28` | Muted fills, table header backgrounds.                        |
| `muted-foreground` | `#9A95B5` | Secondary text, captions, placeholders.                      |
| `foreground`       | `#ECEAF5` | Primary text and icons.                                       |
| `border`           | `#29263B` | Hairline borders, dividers.                                  |
| `input`            | `#2A2740` | Input borders / field outlines.                              |
| `ring`             | `#7C4DFF` | Focus ring.                                                  |

### Status

`success #34D39A` · `warning #FBBF24` · `error #F4506A` (each with `-dark` / `-light` steps). Use for
margin up/down, validation, destructive confirms.

### Charts (distinguishable on dark)

`chart-1 #7C4DFF` (violet) · `chart-2 #22D3EE` (cyan) · `chart-3 #E879F9` (magenta) ·
`chart-4 #34D39A` (teal-green) · `chart-5 #FBBF24` (amber).

### Greyscale

Cool/violet-tinted, monotonic `gray-50` (`#F5F4FA`, lightest) → `gray-900` (`#14111E`, darkest). On
dark, text uses 50–200, muted text 400–500, borders 700–800, surfaces 800–900. **Prefer the semantic
tokens** (`foreground`, `muted-foreground`, `card`, `border`) over raw grays in components.

## Typography

- **Manrope** (matches the real app), loaded via `next/font` as `--font-manrope`; `--font-sans` points
  at it. Fallback `ui-sans-serif, system-ui`.
- Scale: Display 40–56/700 · H1 30/700 · H2 24/600 · H3 20/600 · Body 14–16/400–500 · Caption 12/500.
- Numbers (KPI values) use `font-semibold` and tabular figures where possible.

## Radius, elevation, focus

- `--radius: 0.75rem`. Cards `rounded-xl`/`2xl`, inputs/buttons `rounded-lg`, chips `rounded-full`.
- Elevation on dark = lighter surface + hairline `border-border`, not heavy shadow. Optional soft
  shadow `shadow-[0_8px_30px_rgba(0,0,0,0.35)]` for popovers/dialogs.
- Focus: `ring-2 ring-ring ring-offset-2 ring-offset-background` (violet).
- Canvas has two faint radial glows (violet top-right, cyan bottom-left) so it never reads as flat black.

## Component guidance

- **Primary button:** `bg-primary text-primary-foreground` (white on violet), hover `primary-600`.
- **Secondary/ghost:** `bg-secondary`/transparent, `text-foreground`, `border-border`.
- **KPI stat card:** `card` surface, label in `muted-foreground` (12–13px uppercase tracking), value
  large `foreground`, trend chip in `success`/`error` with ▲/▼.
- **Badges:** Product = violet-soft (`primary-soft` bg, `primary-300` text); Service = cyan
  (`accent`-tinted); Admin = solid violet; Member role = neutral `secondary`.
- **AI chat:** assistant bubble on `card` with a subtle violet left accent; user bubble `primary` /
  `primary-soft`; figure chips inline with cyan accent. Typing indicator = three pulsing dots.
- **Charts:** transparent plot bg, gridlines `border` at low opacity, series from chart-1…5, tooltips on
  `popover`.
- **Sidebar:** `sidebar` bg (slightly darker than canvas), active item = `sidebar-accent` bg +
  `primary-base` left indicator + `foreground` text; inactive `sidebar-foreground`.

## Accessibility (WCAG 2.1 AA) — verified

| Pair                                         | Ratio    | Pass            |
| -------------------------------------------- | -------- | --------------- |
| `foreground` on `background`                 | ~16:1    | ✅ AAA          |
| `foreground` on `card`                       | ~15:1    | ✅ AAA          |
| `muted-foreground` on `card`                 | ~6.5:1   | ✅ AA (normal)  |
| `primary-foreground` (white) on `primary`    | ~4.8:1   | ✅ AA (normal)  |
| `accent-base` (cyan) on `background`         | ~10.7:1  | ✅ (graphic/text) |
| `error` on `background`                      | ~5.8:1   | ✅ AA           |
| each chart color on `background`             | ≥4:1     | ✅ (≥3:1 UI)    |

All body text ≥4.5:1, large text / UI graphics ≥3:1. Don't use `primary-base` violet as text on the
dark canvas for small copy (~4:1) — use `primary-300`/`primary-100` or `foreground` instead; reserve
`primary-base` for fills and graphics.
