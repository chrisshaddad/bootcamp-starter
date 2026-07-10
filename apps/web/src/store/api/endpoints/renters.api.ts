import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  RenterResponse,
  CreateRenterBody,
  PatchRenterBody,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const rentersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRenters: build.query<RenterResponse[], void>({
      query: () => ({ url: '/renters', method: 'GET' }),
      transformResponse: (
        response: RenterResponse[] | ApiEnvelope<RenterResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Renter' as const, id })),
              { type: 'Renter', id: 'LIST' },
            ]
          : [{ type: 'Renter', id: 'LIST' }],
    }),

    getRenter: build.query<RenterResponse, string>({
      query: (id) => ({
        url: `/renters/${encodeURIComponent(id)}`,
        method: 'GET',
      }),
      transformResponse: (
        response: RenterResponse | ApiEnvelope<RenterResponse>,
      ) => unwrap(response),
      providesTags: (_result, _error, id) => [{ type: 'Renter', id }],
    }),

    createRenter: build.mutation<RenterResponse, CreateRenterBody>({
      query: (body) => ({ url: '/renters', method: 'POST', body }),
      transformResponse: (
        response: RenterResponse | ApiEnvelope<RenterResponse>,
      ) => unwrap(response),
      invalidatesTags: [{ type: 'Renter', id: 'LIST' }, 'Timeline'],
    }),

    updateRenter: build.mutation<
      RenterResponse,
      { id: string; body: PatchRenterBody }
    >({
      query: ({ id, body }) => ({
        url: `/renters/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: RenterResponse | ApiEnvelope<RenterResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Renter', id },
        { type: 'Renter', id: 'LIST' },
        'Timeline',
      ],
    }),

    deleteRenter: build.mutation<{ id: string }, string>({
      query: (id) => ({
        url: `/renters/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      transformResponse: (
        response: { id: string } | ApiEnvelope<{ id: string }>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Renter', id },
        { type: 'Renter', id: 'LIST' },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListRentersQuery,
  useGetRenterQuery,
  useCreateRenterMutation,
  useUpdateRenterMutation,
  useDeleteRenterMutation,
} = rentersApi;
