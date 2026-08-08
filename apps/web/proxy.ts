import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'bootcamp_starter_session';
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/signup', '/auth/verify'];

// Default landing page for authenticated users
const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard';

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value || !API_URL) {
    return false;
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
    },
    cache: 'no-store',
  });

  return response.ok;
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = await hasValidSession(request);

  // Handle root path
  if (pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Redirect authenticated users to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Let public routes render unless the session is genuinely valid, in which
  // case authenticated users can still be nudged to the dashboard.
  if (isPublicRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(
      new URL(DEFAULT_AUTHENTICATED_ROUTE, request.url),
    );
  }

  // Redirect unauthenticated users to login (all routes except public are protected)
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
