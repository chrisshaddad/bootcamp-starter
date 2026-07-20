import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  OverdueInvoiceRow,
  RentRollRow,
  ReportSummary,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

function withQuery(base: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getReportSummary: build.query<
      ReportSummary,
      { from?: string; to?: string } | void
    >({
      query: (args) => ({
        url: withQuery('/reports/summary', {
          from: args?.from,
          to: args?.to,
        }),
        method: 'GET',
      }),
      transformResponse: (
        response: ReportSummary | ApiEnvelope<ReportSummary>,
      ) => unwrap(response),
      providesTags: [{ type: 'Report', id: 'SUMMARY' }],
    }),

    getRentRoll: build.query<RentRollRow[], void>({
      query: () => ({ url: '/reports/rent-roll', method: 'GET' }),
      transformResponse: (
        response: RentRollRow[] | ApiEnvelope<RentRollRow[]>,
      ) => unwrap(response),
      providesTags: [{ type: 'Report', id: 'RENT_ROLL' }],
    }),

    getOverdueInvoices: build.query<
      OverdueInvoiceRow[],
      { asOf?: string } | void
    >({
      query: (args) => ({
        url: withQuery('/reports/overdue', { asOf: args?.asOf }),
        method: 'GET',
      }),
      transformResponse: (
        response: OverdueInvoiceRow[] | ApiEnvelope<OverdueInvoiceRow[]>,
      ) => unwrap(response),
      providesTags: [{ type: 'Report', id: 'OVERDUE' }],
    }),
  }),
});

export const {
  useGetReportSummaryQuery,
  useGetRentRollQuery,
  useGetOverdueInvoicesQuery,
} = reportsApi;
