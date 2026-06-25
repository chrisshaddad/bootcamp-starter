export const AUTH_ROUTES = [
  '/login',
  '/auth',
  '/suspended',
  '/portal/deactivated',
];

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
