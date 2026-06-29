export const AUTH_ROUTES = [
  '/login',
  '/auth',
  '/suspended',
  '/portal/deactivated',
];

/** Auto-generated docstring */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
