import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { signIn } from 'next-auth/react';

import type { RootState } from '@/store';
import type { ApiErrorEnvelope } from '@/types/api';
import { TAG_TYPES } from './tag-types';

// Set when the server reports the Keycloak session can no longer be refreshed.
// Guards against many concurrent polls each kicking off a redirect — we only re-auth once.
let reauthInFlight = false;

/**
 * The BFF returns `401 { code: "SESSION_EXPIRED" }` when the refresh token can
 * no longer be exchanged. Recover automatically: bounce through Keycloak, which
 * re-authenticates silently if the Keycloak SSO session is still alive and only
 * shows a login screen otherwise.
 */
function handleSessionExpired() {
  if (typeof window === 'undefined' || reauthInFlight) {
    return;
  }
  reauthInFlight = true;
  const localeSegment = window.location.pathname.split('/')[1];
  const locale = localeSegment === 'ar' ? 'ar' : 'en';
  void signIn(
    'keycloak',
    { callbackUrl: window.location.href },
    { ui_locales: locale, kc_locale: locale },
  );
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NODE_ENV === 'test' ? 'http://localhost/api' : '/api',
  prepareHeaders: (headers, { getState }) => {
    const { ui } = getState() as RootState;
    headers.set('Accept-Language', ui.locale);
    headers.set('X-Client', 'forward-mena-web');
    return headers;
  },
});

export const baseQueryWithErrorHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError | ApiErrorEnvelope
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    const payload = result.error.data as Partial<ApiErrorEnvelope> | undefined;
    const code = payload?.code ?? `HTTP_${result.error.status}`;

    if (code === 'SESSION_EXPIRED') {
      handleSessionExpired();
    }

    return {
      error: {
        status: Number(result.error.status) || 500,
        code,
        message: payload?.message ?? 'Request failed',
        fieldErrors: payload?.fieldErrors,
      },
    };
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: TAG_TYPES,
  keepUnusedDataFor: 60,
  refetchOnMountOrArgChange: 30,
  endpoints: () => ({}),
});
