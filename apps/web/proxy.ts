import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'bootcamp_starter_session';
const ROLE_COOKIE_NAME = 'bootcamp_starter_role';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/auth/verify', '/register'];

// Default landing pages per role
const ADMIN_HOME = '/dashboard';
const MEMBER_HOME = '/portal';

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isMemberPortalRoute(pathname: string): boolean {
  return pathname === '/portal' || pathname.startsWith('/portal/');
}

const KNOWN_ROLES = new Set(['MEMBER', 'ORG_ADMIN', 'SUPER_ADMIN']);

function isKnownRole(role: string | undefined): role is string {
  return !!role && KNOWN_ROLES.has(role);
}

/** Redirect destination for an authenticated user based on their role.
 * Falls back to ADMIN_HOME for unknown/absent roles; client-side auth corrects on load. */
function homeForRole(role: string | undefined): string {
  return role === 'MEMBER' ? MEMBER_HOME : ADMIN_HOME;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const roleCookie = request.cookies.get(ROLE_COOKIE_NAME);
  const isAuthenticated = !!sessionCookie?.value;
  const role = roleCookie?.value;

  // Handle root path
  if (pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  // Redirect authenticated users away from public pages (e.g. /login while logged in)
  if (isPublicRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL(homeForRole(role), request.url));
  }

  // Redirect unauthenticated users to login
  if (!isPublicRoute(pathname) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // MEMBER users must not access admin routes — send them to the portal
  if (
    isAuthenticated &&
    role === 'MEMBER' &&
    !isMemberPortalRoute(pathname) &&
    !isPublicRoute(pathname)
  ) {
    return NextResponse.redirect(new URL(MEMBER_HOME, request.url));
  }

  // Non-MEMBER users (ORG_ADMIN, SUPER_ADMIN) must not access portal routes.
  // Guard on isKnownRole so an absent/stale role cookie doesn't block a valid member session.
  if (isAuthenticated && isKnownRole(role) && role !== 'MEMBER' && isMemberPortalRoute(pathname)) {
    return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
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
