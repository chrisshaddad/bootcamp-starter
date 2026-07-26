import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CreateInvoicePaymentBody,
  CreateInvoicePaymentResult,
  DeleteInvoicePaymentResult,
  InvoicePaymentListItem,
  InvoicePaymentListQuery,
  PaginatedResponse,
  RentPaymentSummaryResponse,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

/** Drops empty/undefined values so blank filters never reach the API. */
function toSearchParams(query: InvoicePaymentListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const invoicePaymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Payments of ONE invoice (invoice-detail view). The endpoint is paginated;
     * this query peels the envelope and asks for a high limit, so callers keep
     * receiving a plain array.
     */
    listInvoicePayments: build.query<InvoicePaymentListItem[], string>({
      query: (invoiceId) => ({
        url: `/invoice-payments?invoiceId=${encodeURIComponent(invoiceId)}&limit=100`,
        method: 'GET',
      }),
      transformResponse: (response: PaginatedResponse<InvoicePaymentListItem>) =>
        response?.items ?? [],
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

    /** Org-wide rent-payment register (/dashboard/rent-payments). */
    listRentPayments: build.query<
      PaginatedResponse<InvoicePaymentListItem>,
      InvoicePaymentListQuery | void
    >({
      query: (query) => ({
        url: `/invoice-payments${toSearchParams(query ?? {})}`,
        method: 'GET',
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: 'InvoicePayment' as const,
                id,
              })),
              { type: 'InvoicePayment', id: 'REGISTER' },
            ]
          : [{ type: 'InvoicePayment', id: 'REGISTER' }],
    }),

    /** Headline numbers for the register, over the same filters as the list. */
    getRentPaymentSummary: build.query<
      RentPaymentSummaryResponse,
      InvoicePaymentListQuery | void
    >({
      query: (query) => ({
        url: `/invoice-payments/summary${toSearchParams(query ?? {})}`,
        method: 'GET',
      }),
      transformResponse: (
        response:
          | RentPaymentSummaryResponse
          | ApiEnvelope<RentPaymentSummaryResponse>,
      ) => unwrap(response),
      providesTags: [{ type: 'InvoicePayment', id: 'SUMMARY' }],
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
        { type: 'InvoicePayment', id: 'REGISTER' },
        { type: 'InvoicePayment', id: 'SUMMARY' },
        { type: 'Invoice', id: invoiceId },
        // a payment changes the invoice's derived status → refresh the list too
        { type: 'Invoice', id: 'LIST' },
        'Report',
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
        { type: 'InvoicePayment', id: 'REGISTER' },
        { type: 'InvoicePayment', id: 'SUMMARY' },
        { type: 'Invoice', id: invoiceId },
        { type: 'Invoice', id: 'LIST' },
        'Report',
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListInvoicePaymentsQuery,
  useListRentPaymentsQuery,
  useGetRentPaymentSummaryQuery,
  useCreateInvoicePaymentMutation,
  useDeleteInvoicePaymentMutation,
} = invoicePaymentsApi;
