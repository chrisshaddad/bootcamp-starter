# PR & Pre-Merge Guidelines

When implementing a new feature or phase, the agent MUST follow these steps before considering the task complete or opening/merging a Pull Request:

1. **Keep UI Consistent:** Ensure all new UI components reuse existing design patterns, tokens (e.g., `primary-base`, `gray-*`), and shadcn/ui components. Check spacing, typography, and layout to match the rest of the application (e.g., Members, Plans).
2. **Lint & Formatting:** Run `npx turbo run lint` and `npm run format:check` locally. Fix any warnings or errors.
3. **Type Checking:** Run `npx turbo run check-types` locally. Resolve all TypeScript errors, especially cross-package dependencies (e.g., rebuild `@repo/contracts` if needed).
4. **Testing:** Test the feature end-to-end to ensure it works properly (both API and UI). Verify tenant isolation (i.e., data from one gym does not leak to another).
5. **Branching & PR Workflow:** When the user explicitly states a phase is done (e.g., "Phase B1 done"), you MUST create a new git branch for the modifications, commit all changes, and open a Pull Request to merge it into the main project branch (e.g., `gym-...`). Do not merge directly; always use a PR.
6. **Backend/Frontend Parity:** Everything implemented in the backend MUST have a frontend UI for it. If the backend API supports creating, reading, updating (editing), or deleting a resource, the frontend MUST expose that functionality to the user (e.g. via Edit dialogs), even if the phase spec does not explicitly list the exact UI components.
