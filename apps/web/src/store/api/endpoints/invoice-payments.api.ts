import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CreateInvoicePaymentBody,
  CreateInvoicePaymentResult,
  DeleteInvoicePaymentResult,
  InvoicePaymentResponse,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const invoicePaymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listInvoicePayments: build.query<InvoicePaymentResponse[], string>({
      query: (invoiceId) => ({
        url: `/invoice-payments?invoiceId=${encodeURIComponent(invoiceId)}`,
        method: 'GET',
      }),
      transformResponse: (
        response:
          InvoicePaymentResponse[] | ApiEnvelope<InvoicePaymentResponse[]>,
      ) => unwrap(response),
      providesTags: (result, _error, invoiceId) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'InvoicePayment' as const,
                id,
              })),
              { type: 'InvoicePayment', id: `LIST-${invoiceId}` },
            ]
          : [{ type: 'InvoicePayment', id: `LIST-${invoiceId}` }],
    }),

    createInvoicePayment: build.mutation<
      CreateInvoicePaymentResult,
      CreateInvoicePaymentBody
    >({
      query: (body) => ({ url: '/invoice-payments', method: 'POST', body }),
      transformResponse: (
        response:
          CreateInvoicePaymentResult | ApiEnvelope<CreateInvoicePaymentResult>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { invoiceId }) => [
        { type: 'InvoicePayment', id: `LIST-${invoiceId}` },
        { type: 'Invoice', id: invoiceId },
        'Timeline',
      ],
    }),

    deleteInvoicePayment: build.mutation<
      DeleteInvoicePaymentResult,
      { id: string; invoiceId: string }
    >({
      query: ({ id }) => ({
        url: `/invoice-payments/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      transformResponse: (
        response:
          DeleteInvoicePaymentResult | ApiEnvelope<DeleteInvoicePaymentResult>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id, invoiceId }) => [
        { type: 'InvoicePayment', id },
        { type: 'InvoicePayment', id: `LIST-${invoiceId}` },
        { type: 'Invoice', id: invoiceId },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListInvoicePaymentsQuery,
  useCreateInvoicePaymentMutation,
  useDeleteInvoicePaymentMutation,
} = invoicePaymentsApi;
