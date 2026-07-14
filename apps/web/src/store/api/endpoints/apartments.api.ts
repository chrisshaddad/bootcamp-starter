import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  ApartmentResponse,
  CreateApartmentBody,
  PatchApartmentBody,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

type FloorScope = { buildingId: string; floorId: string };

export const apartmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listApartments: build.query<ApartmentResponse[], FloorScope>({
      query: ({ buildingId, floorId }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments`,
        method: 'GET',
      }),
      transformResponse: (
        response: ApartmentResponse[] | ApiEnvelope<ApartmentResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Apartment' as const, id })),
              { type: 'Apartment', id: 'LIST' },
            ]
          : [{ type: 'Apartment', id: 'LIST' }],
    }),

    getApartment: build.query<
      ApartmentResponse,
      FloorScope & { apartmentId: string }
    >({
      query: ({ buildingId, floorId, apartmentId }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments/${encodeURIComponent(apartmentId)}`,
        method: 'GET',
      }),
      transformResponse: (
        response: ApartmentResponse | ApiEnvelope<ApartmentResponse>,
      ) => unwrap(response),
      providesTags: (_result, _error, { apartmentId }) => [
        { type: 'Apartment', id: apartmentId },
      ],
    }),

    createApartment: build.mutation<
      ApartmentResponse,
      FloorScope & { body: CreateApartmentBody }
    >({
      query: ({ buildingId, floorId, body }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments`,
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: ApartmentResponse | ApiEnvelope<ApartmentResponse>,
      ) => unwrap(response),
      invalidatesTags: [
        { type: 'Apartment', id: 'LIST' },
        { type: 'Floor', id: 'LIST' },
        'Timeline',
      ],
    }),

    updateApartment: build.mutation<
      ApartmentResponse,
      FloorScope & { apartmentId: string; body: PatchApartmentBody }
    >({
      query: ({ buildingId, floorId, apartmentId, body }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments/${encodeURIComponent(apartmentId)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: ApartmentResponse | ApiEnvelope<ApartmentResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { apartmentId }) => [
        { type: 'Apartment', id: apartmentId },
        { type: 'Apartment', id: 'LIST' },
        'Timeline',
      ],
    }),

    deleteApartment: build.mutation<
      { id: string },
      FloorScope & { apartmentId: string }
    >({
      query: ({ buildingId, floorId, apartmentId }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments/${encodeURIComponent(apartmentId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { apartmentId }) => [
        { type: 'Apartment', id: apartmentId },
        { type: 'Apartment', id: 'LIST' },
        { type: 'Floor', id: 'LIST' },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListApartmentsQuery,
  useGetApartmentQuery,
  useCreateApartmentMutation,
  useUpdateApartmentMutation,
  useDeleteApartmentMutation,
} = apartmentsApi;
