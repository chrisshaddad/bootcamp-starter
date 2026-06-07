# Web

Next.js 16 frontend on port 3000.

## Stack

- **UI:** [shadcn/ui](https://ui.shadcn.com/) on Radix + Tailwind CSS v4
- **Forms:** react-hook-form + Zod (schemas from `@repo/contracts`)
- **Data:** SWR
- **Toasts:** Sonner
- **Font:** Manrope

## Development

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run lint         # ESLint
```

## Add UI components

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
```

The shadcn MCP server is also configured in [`.vscode/mcp.json`](../../.vscode/mcp.json) if you'd rather have your AI assistant install components directly.

## Structure

```
app/
  (authenticated)/  # Routes behind login
  auth/             # Magic-link verification callback
  login/            # Public login
components/
  ui/               # shadcn primitives (don't hand-edit)
  app-sidebar.tsx
  top-navbar.tsx
hooks/              # SWR data hooks (one per resource)
lib/                # api.ts, swr-provider, utils
proxy.ts            # Auth proxy (cookie checks + redirects)
```

## Conventions

See [`../../AGENTS.md`](../../AGENTS.md) for the full set. Highlights:

- Default to server components; opt in to `'use client'` only when needed.
- All API types come from `@repo/contracts`.
- Protected routes go under `app/(authenticated)/`.
- Form schemas are imported from `@repo/contracts` and passed to `zodResolver`.
