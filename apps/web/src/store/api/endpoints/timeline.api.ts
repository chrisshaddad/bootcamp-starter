import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  PaginatedResponse,
  TimelineEvent,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export type ListTimelineParams = {
  page?: number;
  limit?: number;
};

export const timelineApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listTimeline: build.query<
      PaginatedResponse<TimelineEvent>,
      ListTimelineParams | void
    >({
      query: (params) => ({
        url: '/timeline',
        method: 'GET',
        params: params ?? undefined,
      }),
      transformResponse: (
        response:
          | PaginatedResponse<TimelineEvent>
          | ApiEnvelope<PaginatedResponse<TimelineEvent>>,
      ) => unwrap(response),
      providesTags: ['Timeline'],
    }),
  }),
});

export const { useListTimelineQuery } = timelineApi;
