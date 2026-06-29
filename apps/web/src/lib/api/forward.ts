import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/auth/auth';
import { mapAxiosError } from '@/lib/axios/error-mapper';
import { serverApiClient } from '@/lib/axios/server-client';
import { serverEnv } from '@/lib/env';
import type { ApiErrorEnvelope } from '@/types/api';

type ForwardOptions = {
  method?: string;
  upstreamPath: string;
};

const BODYLESS_METHODS = new Set(['GET', 'HEAD']);

function apiError(
  status: number,
  code: string,
  message: string,
): ApiErrorEnvelope {
  return { status, code, message };
}

function passthroughHeaders(request: NextRequest) {
  const headers: Record<string, string> = {};
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    headers['Accept-Language'] = acceptLanguage;
  }
  return headers;
}

async function requestBody(request: NextRequest) {
  if (BODYLESS_METHODS.has(request.method)) {
    return undefined;
  }

  const contentType = request.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return request.json();
  }

  if (contentType?.includes('multipart/form-data')) {
    return request.formData();
  }

  return request.text();
}

export async function forwardToBackend(
  request: NextRequest,
  { method = request.method, upstreamPath }: ForwardOptions,
) {
  const session = await auth();

  if (session?.error === 'RefreshAccessTokenError') {
    const error = apiError(
      401,
      'SESSION_EXPIRED',
      'Your session has expired. Please sign in again.',
    );
    return NextResponse.json(error, { status: error.status });
  }

  if (!session?.accessToken) {
    const error = apiError(
      401,
      'UNAUTHORIZED',
      'No active NextAuth access token. Sign in again or refresh the session.',
    );
    return NextResponse.json(error, { status: error.status });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (
    !BODYLESS_METHODS.has(method) &&
    contentType.includes('multipart/form-data')
  ) {
    try {
      const baseUrl = serverEnv.API_URL;
      const url = `${baseUrl}${upstreamPath}${request.nextUrl.search}`;
      const formData = await request.formData();

      const fetchResponse = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          ...passthroughHeaders(request),
        },
        body: formData,
      });

      let responseBody: unknown;
      const ct = fetchResponse.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        responseBody = await fetchResponse.json();
      } else {
        responseBody = await fetchResponse.text();
      }

      return NextResponse.json(responseBody, { status: fetchResponse.status });
    } catch (error) {
      const mapped = mapAxiosError(error);
      return NextResponse.json(mapped, { status: mapped.status });
    }
  }

  try {
    const response = await serverApiClient.request({
      url: `${upstreamPath}${request.nextUrl.search}`,
      method,
      data: await requestBody(request),
      headers: passthroughHeaders(request),
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    const mapped =
      error &&
      typeof error === 'object' &&
      'status' in error &&
      'message' in error
        ? (error as ApiErrorEnvelope)
        : mapAxiosError(error);

    return NextResponse.json(mapped, { status: mapped.status });
  }
}

type RouteParamsContext = { params?: Promise<Record<string, string>> };

/**
 * Wrap a BFF forwarder route handler with Auth.js.
 *
 * Required so that when `auth()` wraps a route handler, Auth.js appends the
 * refreshed `Set-Cookie` to the response, persisting a rotated Keycloak refresh
 * token back to the browser. A bare `await auth()` inside the handler only
 * refreshes in-memory and leaves the cookie stale, eventually causing
 * `invalid_grant: "Session not active"`.
 */
export function forwardRoute(
  upstreamPath: string | ((params: Record<string, string>) => string),
) {
  return auth(async (request, context) => {
    const rawParams = (context as RouteParamsContext | undefined)?.params;
    const params = rawParams ? await rawParams : {};
    const path =
      typeof upstreamPath === 'function' ? upstreamPath(params) : upstreamPath;
    return forwardToBackend(request, { upstreamPath: path });
  });
}
