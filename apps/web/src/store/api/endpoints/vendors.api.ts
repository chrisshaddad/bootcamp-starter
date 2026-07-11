import { baseApi } from '@/store/api/base-api';
import type { ApiEnvelope, VendorResponse } from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const vendorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listVendors: build.query<VendorResponse[], void>({
      query: () => ({ url: '/vendors', method: 'GET' }),
      transformResponse: (
        response: VendorResponse[] | ApiEnvelope<VendorResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Vendor' as const, id })),
              { type: 'Vendor', id: 'LIST' },
            ]
          : [{ type: 'Vendor', id: 'LIST' }],
    }),
  }),
});

export const { useListVendorsQuery } = vendorsApi;
