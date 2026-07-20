import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'bootcamp_starter_session';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/auth/verify'];

// Public routes that should redirect an already-authenticated visitor away.
// /auth/verify is deliberately excluded from this list — it must always be
// allowed to run so a magic-link token can be consumed even if the browser
// already holds a session cookie (e.g. an invite link opened in the same
// browser as an existing admin session). Bouncing it here would silently
// skip verification and leave the old session in place.
const authRedirectRoutes = ['/login'];

// Default landing page for authenticated users
const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard';

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = !!sessionCookie?.value;

  // Handle root path
  if (pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Redirect authenticated users to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect authenticated users away from the login page
  if (matchesRoute(pathname, authRedirectRoutes) && isAuthenticated) {
    return NextResponse.redirect(
      new URL(DEFAULT_AUTHENTICATED_ROUTE, request.url),
    );
  }

  // Redirect unauthenticated users to login (all routes except public are protected)
  if (!matchesRoute(pathname, publicRoutes) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
