import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CreateMaintenanceRequestBody,
  MaintenanceRequestDetailResponse,
  MaintenanceRequestResponse,
  PatchMaintenanceRequestBody,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const maintenanceRequestsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listMaintenanceRequests: build.query<MaintenanceRequestResponse[], void>({
      query: () => ({ url: '/maintenance-requests', method: 'GET' }),
      transformResponse: (
        response:
          | MaintenanceRequestResponse[]
          | ApiEnvelope<MaintenanceRequestResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'MaintenanceRequest' as const,
                id,
              })),
              { type: 'MaintenanceRequest', id: 'LIST' },
            ]
          : [{ type: 'MaintenanceRequest', id: 'LIST' }],
    }),

    getMaintenanceRequest: build.query<
      MaintenanceRequestDetailResponse,
      string
    >({
      query: (id) => ({
        url: `/maintenance-requests/${encodeURIComponent(id)}`,
        method: 'GET',
      }),
      transformResponse: (
        response:
          | MaintenanceRequestDetailResponse
          | ApiEnvelope<MaintenanceRequestDetailResponse>,
      ) => unwrap(response),
      providesTags: (_result, _error, id) => [
        { type: 'MaintenanceRequest', id },
      ],
    }),

    createMaintenanceRequest: build.mutation<
      MaintenanceRequestResponse,
      CreateMaintenanceRequestBody
    >({
      query: (body) => ({
        url: '/maintenance-requests',
        method: 'POST',
        body,
      }),
      transformResponse: (
        response:
          MaintenanceRequestResponse | ApiEnvelope<MaintenanceRequestResponse>,
      ) => unwrap(response),
      invalidatesTags: [{ type: 'MaintenanceRequest', id: 'LIST' }, 'Timeline'],
    }),

    updateMaintenanceRequest: build.mutation<
      MaintenanceRequestResponse,
      { id: string; body: PatchMaintenanceRequestBody }
    >({
      query: ({ id, body }) => ({
        url: `/maintenance-requests/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response:
          MaintenanceRequestResponse | ApiEnvelope<MaintenanceRequestResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'MaintenanceRequest', id },
        { type: 'MaintenanceRequest', id: 'LIST' },
        'Timeline',
      ],
    }),

    deleteMaintenanceRequest: build.mutation<{ id: string }, string>({
      query: (id) => ({
        url: `/maintenance-requests/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      transformResponse: (
        response: { id: string } | ApiEnvelope<{ id: string }>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, id) => [
        { type: 'MaintenanceRequest', id },
        { type: 'MaintenanceRequest', id: 'LIST' },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListMaintenanceRequestsQuery,
  useGetMaintenanceRequestQuery,
  useCreateMaintenanceRequestMutation,
  useUpdateMaintenanceRequestMutation,
  useDeleteMaintenanceRequestMutation,
} = maintenanceRequestsApi;
