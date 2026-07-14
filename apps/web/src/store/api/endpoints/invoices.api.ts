import { baseApi } from '@/store/api/base-api';
import type { ApiEnvelope, InvoiceResponse } from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const invoicesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listInvoices: build.query<InvoiceResponse[], void>({
      query: () => ({ url: '/invoices', method: 'GET' }),
      transformResponse: (
        response: InvoiceResponse[] | ApiEnvelope<InvoiceResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Invoice' as const, id })),
              { type: 'Invoice', id: 'LIST' },
            ]
          : [{ type: 'Invoice', id: 'LIST' }],
    }),
  }),
});

export const { useListInvoicesQuery } = invoicesApi;
