# PR & Pre-Merge Guidelines

When implementing a new feature or phase, the agent MUST follow these steps before considering the task complete or opening/merging a Pull Request:

1. **Keep UI Consistent:** Ensure all new UI components reuse existing design patterns, tokens (e.g., `primary-base`, `gray-*`), and shadcn/ui components. Check spacing, typography, and layout to match the rest of the application (e.g., Members, Plans).
2. **Lint & Formatting:** Run `npx turbo run lint` and `npm run format:check` locally. Fix any warnings or errors.
3. **Type Checking:** Run `npx turbo run check-types` locally. Resolve all TypeScript errors, especially cross-package dependencies (e.g., rebuild `@repo/contracts` if needed).
4. **Testing:** Test the feature end-to-end to ensure it works properly (both API and UI). Verify tenant isolation (i.e., data from one gym does not leak to another).
5. **Branching & PR Workflow:** When the user explicitly states a phase is done (e.g., "Phase B1 done"), you MUST create a new git branch for the modifications, commit all changes, and open a Pull Request to merge it into the main project branch (e.g., `gym-...`). Do not merge directly; always use a PR.
6. **Backend/Frontend Parity:** Everything implemented in the backend MUST have a frontend UI for it. If the backend API supports creating, reading, updating (editing), or deleting a resource, the frontend MUST expose that functionality to the user (e.g. via Edit dialogs), even if the phase spec does not explicitly list the exact UI components.
7. **Never Force Push:** NEVER use `git push -f` or `git push --force`. Always use standard commits and normal pushes to avoid rewriting git history or risking the work of other collaborators. If you need to fix a commit, make a new commit instead of amending and force-pushing.

---

# Development Practices

## Frontend ↔ Backend Verification

**Before writing any frontend feature, verify what the backend actually supports.** Do not hardcode UI behaviour that the API cannot back up.

Checklist before building a new frontend component or hook:
- Read the relevant NestJS controller (`apps/api/src/<feature>/<feature>.controller.ts`) and check which routes exist, which query params are accepted, and which roles are required.
- Read the contract schema (`packages/contracts/src/<feature>/`) to understand the exact request/response shapes.
- Only build UI for operations the API actually exposes. If a filter, sort, or action isn't in the contract + controller, don't fake it client-side and call it done — either implement the backend first or note it as out-of-scope.
- When a feature requires a new query param (e.g., a status filter), add it to the contract schema AND the controller `@ApiQuery` AND the SWR hook AND the UI in one go. Don't leave any layer out.

## Docstring Standards

**Every exported function, component, hook, and public service method must have a meaningful `/** ... */` JSDoc comment.** The comment must describe what the function does, not just restate the function name.

Rules:
- ✅ Good: `/** Returns the list of active instructors available in the given time window */`
- ❌ Bad: `/** Get available instructors */` (too terse — just the name)
- ❌ Bad: `/** Auto-generated docstring */` or `/** TODO */` — never commit placeholder docstrings
- ❌ Bad: Multi-line novels for a five-line helper — one line is enough for simple functions

Where docstrings are required in this project:
- **NestJS services**: all public `async` methods (already enforced by AGENTS.md in the root)
- **NestJS controllers**: all route handler methods (already enforced)
- **Next.js pages**: the default export function and every named helper component/function in the file
- **SWR hooks** (`hooks/use-*.ts`): every exported function
- **Inline closures** (`onSubmit`, `handleClose`, `getIsoString`, etc.): add a one-liner if the function's purpose isn't immediately obvious from its name and 3-line body

## Date / Time Validation

**Never hardcode a static date string as a minimum boundary unless it's a genuine business rule.** Use dynamic computation instead.

- **Frontend date pickers**: set `min={format(new Date(), 'yyyy-MM-dd')}` so the floor is always "today", not a fixed year. Compute this once at module level (e.g., `const MIN_DATE = format(new Date(), 'yyyy-MM-dd')`) so it doesn't re-render on every keystroke.
- **Zod form schema**: validate `(d) => d >= MIN_DATE` where `MIN_DATE` is the dynamically computed string, and set the error message to `'Sessions cannot be scheduled in the past'` (not a year-specific string).
- **Shared contract** (`packages/contracts`): the `.refine()` check on `startsAt`/`endsAt` should also use a dynamic `new Date()` comparison so the API rejects stale dates regardless of when the server was deployed.
- **Service layer**: the `update()` method should guard against editing past records by comparing `existing.startsAt < new Date()` and throwing `BadRequestException('Past sessions cannot be edited')`. The contract handles creation; the service handles mutation of existing records.

## Enum Safety

**Always verify DB enum values before writing business logic or UI.** This project's session status is `GymSessionStatus { SCHEDULED, CANCELLED, COMPLETED }` — the default/active state is `SCHEDULED`, not `ACTIVE`. Never assume enum names; read `packages/database/prisma/schema.prisma` first.

Pattern for checking status in UI:
```tsx
// Correct — 'SCHEDULED' is the live/active state
{session.status !== 'SCHEDULED' && <StatusBadge status={session.status} />}

// Wrong — 'ACTIVE' does not exist in this schema
{session.status !== 'ACTIVE' && <StatusBadge />}
```

## Status Filters on List Pages

Every admin list page that shows records with multiple statuses (sessions, bookings, members, etc.) **must include a status filter UI**. Follow this pattern:

- Render pill/tab buttons for each status value plus an `ALL` option.
- Apply filtering client-side if the full list fits in one page (no pagination); otherwise pass the filter as a query param to the API hook.
- The active pill uses `bg-primary-base text-white`; inactive pills use `border-gray-200 text-gray-600 hover:border-primary-base hover:text-primary-base`.
- Empty-state messages must reflect the current filter (e.g., "No cancelled sessions." not "No sessions.").

## Unsafe `any` in Prisma Queries

**Never use `where: any` or similar untyped intermediate objects when building Prisma query conditions.** Spread the conditions directly into the `where` object so TypeScript can type-check the field names:

```ts
// Correct
this.prisma.gymSession.findMany({
  where: {
    gymId,
    ...(status && { status }),
    ...(startDate || endDate ? { startsAt: { gte: ..., lte: ... } } : {}),
  },
})

// Wrong — triggers @typescript-eslint/no-unsafe-member-access
const where: any = { gymId };
if (status) where.status = status;
```

## Textarea vs Input for Long Text

**Description fields must always use `<Textarea>` not `<Input>`.** A single-line `<Input>` truncates long text visually and is inaccessible for paragraph-length content. Always:
- Use `<Textarea rows={3}>` (or more) for any field that might contain more than ~60 characters.
- Show a live character counter below the field when a `maxLength` applies: `<p className="text-xs text-gray-400 ml-auto">{value.length}/500</p>`.
- Watch the field with `form.watch('fieldName') ?? ''` to feed the counter.
