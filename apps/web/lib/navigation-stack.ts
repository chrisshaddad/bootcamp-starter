const STACK_KEY = 'nav:stack';
const MAX_STACK_SIZE = 20;

export function readNavigationStack(): string[] {
  try {
    const raw = window.sessionStorage.getItem(STACK_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function writeNavigationStack(stack: string[]): void {
  window.sessionStorage.setItem(STACK_KEY, JSON.stringify(stack));
}

/**
 * Pushes `pathname` onto the stack, unless it's exactly the entry one step
 * behind the current top — in that case we pop instead. That single rule is
 * what makes both a real browser back-navigation *and* BackLink's own
 * router.push() collapse the stack correctly rather than endlessly growing
 * it, so "Back to X" stays accurate no matter how many hops deep you are
 * (e.g. Explore -> Project -> Profile -> Back correctly reads "Back to
 * Explore" once you're back on the Project page, not "Back to Profile").
 */
export function reduceNavigationStack(
  stack: string[],
  pathname: string,
): string[] {
  if (stack[stack.length - 1] === pathname) return stack;

  if (stack.length >= 2 && stack[stack.length - 2] === pathname) {
    return stack.slice(0, -1);
  }

  const next = [...stack, pathname];
  return next.length > MAX_STACK_SIZE
    ? next.slice(next.length - MAX_STACK_SIZE)
    : next;
}

export function getPreviousPath(stack: string[]): string | null {
  return stack.length >= 2 ? (stack[stack.length - 2] ?? null) : null;
}
