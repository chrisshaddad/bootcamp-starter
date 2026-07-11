import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  VendorResponse,
  CreateVendorBody,
  PatchVendorBody,
} from '@/types/api';

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

    createVendor: build.mutation<VendorResponse, CreateVendorBody>({
      query: (body) => ({ url: '/vendors', method: 'POST', body }),
      transformResponse: (
        response: VendorResponse | ApiEnvelope<VendorResponse>,
      ) => unwrap(response),
      invalidatesTags: [{ type: 'Vendor', id: 'LIST' }, 'Timeline'],
    }),

    updateVendor: build.mutation<
      VendorResponse,
      { id: string; body: PatchVendorBody }
    >({
      query: ({ id, body }) => ({
        url: `/vendors/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: VendorResponse | ApiEnvelope<VendorResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Vendor', id },
        { type: 'Vendor', id: 'LIST' },
        'Timeline',
      ],
    }),

    deleteVendor: build.mutation<{ id: string }, string>({
      query: (id) => ({
        url: `/vendors/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      transformResponse: (
        response: { id: string } | ApiEnvelope<{ id: string }>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Vendor', id },
        { type: 'Vendor', id: 'LIST' },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} = vendorsApi;
