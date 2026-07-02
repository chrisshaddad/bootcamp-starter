import { baseApi } from '@/store/api/base-api';
import type { ApiEnvelope, MeResponse } from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const meApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<MeResponse, void>({
      query: () => ({ url: '/me', method: 'GET' }),
      transformResponse: (response: MeResponse | ApiEnvelope<MeResponse>) =>
        unwrap(response),
      providesTags: ['Me', 'Org'],
    }),
  }),
});

export const { useGetMeQuery } = meApi;
