import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CreateSupportTicketBody,
  PatchSupportTicketBody,
  SupportTicketResponse,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const supportTicketsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listSupportTickets: build.query<SupportTicketResponse[], void>({
      query: () => ({ url: '/support-tickets', method: 'GET' }),
      transformResponse: (
        response: SupportTicketResponse[] | ApiEnvelope<SupportTicketResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'SupportTicket' as const,
                id,
              })),
              { type: 'SupportTicket', id: 'LIST' },
            ]
          : [{ type: 'SupportTicket', id: 'LIST' }],
    }),

    getSupportTicket: build.query<SupportTicketResponse, string>({
      query: (id) => ({
        url: `/support-tickets/${encodeURIComponent(id)}`,
        method: 'GET',
      }),
      transformResponse: (
        response: SupportTicketResponse | ApiEnvelope<SupportTicketResponse>,
      ) => unwrap(response),
      providesTags: (_result, _error, id) => [{ type: 'SupportTicket', id }],
    }),

    createSupportTicket: build.mutation<
      SupportTicketResponse,
      CreateSupportTicketBody
    >({
      query: (body) => ({ url: '/support-tickets', method: 'POST', body }),
      transformResponse: (
        response: SupportTicketResponse | ApiEnvelope<SupportTicketResponse>,
      ) => unwrap(response),
      // Creating a ticket auto-acknowledges it and produces a notification.
      invalidatesTags: [
        { type: 'SupportTicket', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
        'Timeline',
      ],
    }),

    updateSupportTicket: build.mutation<
      SupportTicketResponse,
      { id: string; body: PatchSupportTicketBody }
    >({
      query: ({ id, body }) => ({
        url: `/support-tickets/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: SupportTicketResponse | ApiEnvelope<SupportTicketResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SupportTicket', id },
        { type: 'SupportTicket', id: 'LIST' },
        { type: 'Notification', id: 'LIST' },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListSupportTicketsQuery,
  useGetSupportTicketQuery,
  useCreateSupportTicketMutation,
  useUpdateSupportTicketMutation,
} = supportTicketsApi;
