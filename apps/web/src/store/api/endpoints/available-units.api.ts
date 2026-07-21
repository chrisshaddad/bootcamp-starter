import { baseApi } from '@/store/api/base-api';
import type { ApiEnvelope, AvailableUnit } from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const availableUnitsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * F6.2 — vacant apartments surfaced in the renter-facing "Available units"
     * showcase (GET /available-units), enriched with building/floor names.
     * Read-only; there is no create/update/delete for this list — prospective
     * tenants "express interest" via a regular support ticket instead.
     */
    getAvailableUnits: build.query<AvailableUnit[], void>({
      query: () => ({ url: '/available-units', method: 'GET' }),
      transformResponse: (
        response: AvailableUnit[] | ApiEnvelope<AvailableUnit[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'AvailableUnit' as const,
                id,
              })),
              { type: 'AvailableUnit', id: 'LIST' },
            ]
          : [{ type: 'AvailableUnit', id: 'LIST' }],
    }),
  }),
});

export const { useGetAvailableUnitsQuery } = availableUnitsApi;
