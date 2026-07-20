import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CreateTenantMaintenanceRequestBody,
  TenantMaintenanceRequestView,
  TenantOverviewResponse,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTenantOverview: build.query<TenantOverviewResponse, void>({
      query: () => ({ url: '/tenant/overview', method: 'GET' }),
      transformResponse: (
        response: TenantOverviewResponse | ApiEnvelope<TenantOverviewResponse>,
      ) => unwrap(response),
      providesTags: [{ type: 'TenantOverview', id: 'ME' }],
    }),

    createTenantMaintenanceRequest: build.mutation<
      TenantMaintenanceRequestView,
      CreateTenantMaintenanceRequestBody
    >({
      query: (body) => ({
        url: '/tenant/maintenance-requests',
        method: 'POST',
        body,
      }),
      transformResponse: (
        response:
          | TenantMaintenanceRequestView
          | ApiEnvelope<TenantMaintenanceRequestView>,
      ) => unwrap(response),
      // A new request changes the overview's request list and the tenant's
      // own activity feed.
      invalidatesTags: [{ type: 'TenantOverview', id: 'ME' }, 'Timeline'],
    }),
  }),
});

export const {
  useGetTenantOverviewQuery,
  useCreateTenantMaintenanceRequestMutation,
} = tenantApi;
