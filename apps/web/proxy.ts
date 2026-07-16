import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'bootcamp_starter_session';

// Auth entry pages — bounce authenticated users to the dashboard
const authEntryRoutes = ['/login', '/auth/verify'];

// Routes that do not require a session (includes auth entry + public browse)
const publicRoutes = [...authEntryRoutes, '/browse'];

const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard';

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isAuthEntryRoute(pathname: string): boolean {
  return authEntryRoutes.some((route) => matchesRoute(pathname, route));
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => matchesRoute(pathname, route));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = !!sessionCookie?.value;

  if (pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/browse', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isAuthEntryRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(
      new URL(DEFAULT_AUTHENTICATED_ROUTE, request.url),
    );
  }

  if (!isPublicRoute(pathname) && !isAuthenticated) {
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
