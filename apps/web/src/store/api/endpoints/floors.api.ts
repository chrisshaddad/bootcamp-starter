import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  FloorResponse,
  CreateFloorBody,
  PatchFloorBody,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const floorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listFloors: build.query<FloorResponse[], string>({
      query: (buildingId) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors`,
        method: 'GET',
      }),
      transformResponse: (
        response: FloorResponse[] | ApiEnvelope<FloorResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Floor' as const, id })),
              { type: 'Floor', id: 'LIST' },
            ]
          : [{ type: 'Floor', id: 'LIST' }],
    }),

    getFloor: build.query<
      FloorResponse,
      { buildingId: string; floorId: string }
    >({
      query: ({ buildingId, floorId }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}`,
        method: 'GET',
      }),
      transformResponse: (
        response: FloorResponse | ApiEnvelope<FloorResponse>,
      ) => unwrap(response),
      providesTags: (_result, _error, { floorId }) => [
        { type: 'Floor', id: floorId },
      ],
    }),

    createFloor: build.mutation<
      FloorResponse,
      { buildingId: string; body: CreateFloorBody }
    >({
      query: ({ buildingId, body }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors`,
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: FloorResponse | ApiEnvelope<FloorResponse>,
      ) => unwrap(response),
      invalidatesTags: [{ type: 'Floor', id: 'LIST' }, 'Timeline'],
    }),

    updateFloor: build.mutation<
      FloorResponse,
      { buildingId: string; floorId: string; body: PatchFloorBody }
    >({
      query: ({ buildingId, floorId, body }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: FloorResponse | ApiEnvelope<FloorResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { floorId }) => [
        { type: 'Floor', id: floorId },
        { type: 'Floor', id: 'LIST' },
        'Timeline',
      ],
    }),

    deleteFloor: build.mutation<
      { id: string },
      { buildingId: string; floorId: string }
    >({
      query: ({ buildingId, floorId }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { floorId }) => [
        { type: 'Floor', id: floorId },
        { type: 'Floor', id: 'LIST' },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListFloorsQuery,
  useGetFloorQuery,
  useCreateFloorMutation,
  useUpdateFloorMutation,
  useDeleteFloorMutation,
} = floorsApi;
