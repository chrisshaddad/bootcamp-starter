import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'bootcamp_starter_session';

// Default landing page for authenticated users
const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard';

function isAuthRoute(pathname: string): boolean {
  const authRoutes = ['/login', '/signup', '/auth/verify', '/forgot-password'];
  return authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isPubliclyAccessibleRoute(pathname: string): boolean {
  // 1. Auth routes are publicly accessible
  if (isAuthRoute(pathname)) return true;

  // 2. Reset-password isn't gated on auth state either direction — the
  // emailed token is the actual proof of identity, and a still-logged-in
  // user should be able to complete a reset without being bounced away.
  if (
    pathname === '/reset-password' ||
    pathname.startsWith('/reset-password/')
  ) {
    return true;
  }

  // 3. Allow public access to showcase pages (e.g., /projects/my-project-slug)
  // This matches alphanumeric characters and dashes (-) but EXCLUDES 'new' or sub-paths like '/edit'
  const showcaseMatch = pathname.match(/^\/projects\/([^/]+)$/);
  if (showcaseMatch) {
    const slug = showcaseMatch[1];
    return slug !== 'new'; // /projects/new is private, but /projects/some-slug is public
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = !!sessionCookie?.value;

  // Intercept magic link clicks from emails (GET) and bridge to backend (POST)
  if (pathname === '/auth/verify') {
    const token = searchParams.get('token');

    if (token) {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const apiRes = await fetch(`${apiUrl}/auth/magic-link/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (apiRes.ok) {
          const data = await apiRes.json();
          const sessionId = data.sessionId || data.data?.sessionId;

          if (sessionId) {
            const response = NextResponse.redirect(
              new URL(DEFAULT_AUTHENTICATED_ROUTE, request.url),
            );
            response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
              path: '/',
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            });
            return response;
          }
        }
      } catch (error) {
        console.error('Magic link verification failed:', error);
      }
    }

    return NextResponse.redirect(
      new URL('/login?error=invalid_magic_link', request.url),
    );
  }

  // Handle root path
  if (pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect authenticated users away only from auth routes (login/signup)
  if (isAuthRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(
      new URL(DEFAULT_AUTHENTICATED_ROUTE, request.url),
    );
  }

  // Redirect unauthenticated users to login if route is not publicly accessible
  if (!isPubliclyAccessibleRoute(pathname) && !isAuthenticated) {
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
