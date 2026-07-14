import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CreateInvoiceBody,
  InvoiceResponse,
  PatchInvoiceBody,
} from '@/types/api';

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

    getInvoice: build.query<InvoiceResponse, string>({
      query: (id) => ({ url: `/invoices/${encodeURIComponent(id)}`, method: 'GET' }),
      transformResponse: (
        response: InvoiceResponse | ApiEnvelope<InvoiceResponse>,
      ) => unwrap(response),
      providesTags: (_result, _error, id) => [{ type: 'Invoice', id }],
    }),

    createInvoice: build.mutation<InvoiceResponse, CreateInvoiceBody>({
      query: (body) => ({ url: '/invoices', method: 'POST', body }),
      transformResponse: (
        response: InvoiceResponse | ApiEnvelope<InvoiceResponse>,
      ) => unwrap(response),
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }, 'Timeline'],
    }),

    updateInvoice: build.mutation<
      InvoiceResponse,
      { id: string; body: PatchInvoiceBody }
    >({
      query: ({ id, body }) => ({
        url: `/invoices/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: InvoiceResponse | ApiEnvelope<InvoiceResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Invoice', id },
        { type: 'Invoice', id: 'LIST' },
        'Timeline',
      ],
    }),

    deleteInvoice: build.mutation<{ id: string }, string>({
      query: (id) => ({
        url: `/invoices/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      transformResponse: (
        response: { id: string } | ApiEnvelope<{ id: string }>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Invoice', id },
        { type: 'Invoice', id: 'LIST' },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
} = invoicesApi;
