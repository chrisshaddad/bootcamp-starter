import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  PaginatedResponse,
  PaymentResponse,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export type ListPaymentsParams = {
  page?: number;
  limit?: number;
  status?: string;
};

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPayments: build.query<
      PaginatedResponse<PaymentResponse>,
      ListPaymentsParams | void
    >({
      query: (params) => ({
        url: '/payments',
        method: 'GET',
        params: params ?? undefined,
      }),
      transformResponse: (
        response:
          | PaginatedResponse<PaymentResponse>
          | ApiEnvelope<PaginatedResponse<PaymentResponse>>,
      ) => unwrap(response),
      providesTags: ['Payment'],
    }),
  }),
});

export const { useListPaymentsQuery } = paymentsApi;
