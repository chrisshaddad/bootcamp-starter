import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  NotificationListResponse,
  NotificationResponse,
  UnreadCountResponse,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Returns both the list and the unread count in one round-trip. The payload
    // itself is the envelope ({ data, unreadCount }), so it is NOT unwrapped.
    listNotifications: build.query<NotificationListResponse, void>({
      query: () => ({ url: '/notifications', method: 'GET' }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: 'Notification' as const,
                id,
              })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    // Lightweight endpoint for the header bell badge; polled independently.
    getUnreadCount: build.query<UnreadCountResponse, void>({
      query: () => ({ url: '/notifications/unread-count', method: 'GET' }),
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),

    markNotificationRead: build.mutation<NotificationResponse, string>({
      query: (id) => ({
        url: `/notifications/${encodeURIComponent(id)}/read`,
        method: 'POST',
      }),
      transformResponse: (
        response: NotificationResponse | ApiEnvelope<NotificationResponse>,
      ) => unwrap(response),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),

    markAllNotificationsRead: build.mutation<{ count: number }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      transformResponse: (
        response: { count: number } | ApiEnvelope<{ count: number }>,
      ) => unwrap(response),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
