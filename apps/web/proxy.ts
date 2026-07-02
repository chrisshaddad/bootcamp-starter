import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'bootcamp_starter_session';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/auth/verify'];

// Default landing page for authenticated users
const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard';

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

// 1. CHANGED: Made it async
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = !!sessionCookie?.value;

  // 2. ADDED: Intercept magic link clicks from emails (GET) and bridge to backend (POST)
  if (pathname === '/auth/verify') {
    const token = searchParams.get('token');

    if (token) {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        // Make the POST request exactly like Postman does
        const apiRes = await fetch(`${apiUrl}/auth/magic-link/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          const sessionId = data.sessionId || data.data?.sessionId;

          if (sessionId) {
            // Success! Set the session cookie and redirect to dashboard
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

    // If token is missing or verification fails, go to login
    return NextResponse.redirect(
      new URL('/login?error=invalid_magic_link', request.url),
    );
  }

  // Handle root path
  if (pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Redirect authenticated users to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect authenticated users away from public pages
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
