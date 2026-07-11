import { baseApi } from '@/store/api/base-api';
import type { ApiEnvelope, MaintenanceRequestResponse } from '@/types/api';

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
  }),
});

export const { useListMaintenanceRequestsQuery } = maintenanceRequestsApi;
