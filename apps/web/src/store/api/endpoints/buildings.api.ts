import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  BuildingResponse,
  CreateBuildingBody,
  PatchBuildingBody,
  SetBuildingAssignmentsBody,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const buildingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listBuildings: build.query<BuildingResponse[], void>({
      query: () => ({ url: '/buildings', method: 'GET' }),
      transformResponse: (
        response: BuildingResponse[] | ApiEnvelope<BuildingResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Building' as const, id })),
              { type: 'Building', id: 'LIST' },
            ]
          : [{ type: 'Building', id: 'LIST' }],
    }),

    getBuilding: build.query<BuildingResponse, string>({
      query: (id) => ({
        url: `/buildings/${encodeURIComponent(id)}`,
        method: 'GET',
      }),
      transformResponse: (
        response: BuildingResponse | ApiEnvelope<BuildingResponse>,
      ) => unwrap(response),
      providesTags: (_result, _error, id) => [{ type: 'Building', id }],
    }),

    createBuilding: build.mutation<BuildingResponse, CreateBuildingBody>({
      query: (body) => ({ url: '/buildings', method: 'POST', body }),
      transformResponse: (
        response: BuildingResponse | ApiEnvelope<BuildingResponse>,
      ) => unwrap(response),
      invalidatesTags: [{ type: 'Building', id: 'LIST' }, 'Timeline'],
    }),

    updateBuilding: build.mutation<
      BuildingResponse,
      { id: string; body: PatchBuildingBody }
    >({
      query: ({ id, body }) => ({
        url: `/buildings/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: BuildingResponse | ApiEnvelope<BuildingResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Building', id },
        { type: 'Building', id: 'LIST' },
        'Timeline',
      ],
    }),

    deleteBuilding: build.mutation<{ id: string }, string>({
      query: (id) => ({
        url: `/buildings/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Building', id },
        { type: 'Building', id: 'LIST' },
        'Timeline',
      ],
    }),

    setBuildingAssignments: build.mutation<
      BuildingResponse,
      { id: string; body: SetBuildingAssignmentsBody }
    >({
      query: ({ id, body }) => ({
        url: `/buildings/${encodeURIComponent(id)}/assignments`,
        method: 'PUT',
        body,
      }),
      transformResponse: (
        response: BuildingResponse | ApiEnvelope<BuildingResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Building', id },
        { type: 'Building', id: 'LIST' },
        'Membership',
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListBuildingsQuery,
  useGetBuildingQuery,
  useCreateBuildingMutation,
  useUpdateBuildingMutation,
  useDeleteBuildingMutation,
  useSetBuildingAssignmentsMutation,
} = buildingsApi;
