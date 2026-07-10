import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  LeaseResponse,
  CreateLeaseBody,
  PatchLeaseBody,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

type ApartmentScope = {
  buildingId: string;
  floorId: string;
  apartmentId: string;
};

export const leasesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listLeases: build.query<LeaseResponse[], ApartmentScope>({
      query: ({ buildingId, floorId, apartmentId }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments/${encodeURIComponent(apartmentId)}/leases`,
        method: 'GET',
      }),
      transformResponse: (
        response: LeaseResponse[] | ApiEnvelope<LeaseResponse[]>,
      ) => unwrap(response),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Lease' as const, id })),
              { type: 'Lease', id: 'LIST' },
            ]
          : [{ type: 'Lease', id: 'LIST' }],
    }),

    getLease: build.query<LeaseResponse, ApartmentScope & { leaseId: string }>({
      query: ({ buildingId, floorId, apartmentId, leaseId }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments/${encodeURIComponent(apartmentId)}/leases/${encodeURIComponent(leaseId)}`,
        method: 'GET',
      }),
      transformResponse: (
        response: LeaseResponse | ApiEnvelope<LeaseResponse>,
      ) => unwrap(response),
      providesTags: (_result, _error, { leaseId }) => [
        { type: 'Lease', id: leaseId },
      ],
    }),

    createLease: build.mutation<
      LeaseResponse,
      ApartmentScope & { body: CreateLeaseBody }
    >({
      query: ({ buildingId, floorId, apartmentId, body }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments/${encodeURIComponent(apartmentId)}/leases`,
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: LeaseResponse | ApiEnvelope<LeaseResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { apartmentId }) => [
        { type: 'Lease', id: 'LIST' },
        { type: 'Apartment', id: apartmentId },
        { type: 'Apartment', id: 'LIST' },
        { type: 'Renter', id: 'LIST' },
        'Timeline',
      ],
    }),

    updateLease: build.mutation<
      LeaseResponse,
      ApartmentScope & { leaseId: string; body: PatchLeaseBody }
    >({
      query: ({ buildingId, floorId, apartmentId, leaseId, body }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments/${encodeURIComponent(apartmentId)}/leases/${encodeURIComponent(leaseId)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: LeaseResponse | ApiEnvelope<LeaseResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { apartmentId, leaseId }) => [
        { type: 'Lease', id: leaseId },
        { type: 'Lease', id: 'LIST' },
        { type: 'Apartment', id: apartmentId },
        { type: 'Apartment', id: 'LIST' },
        { type: 'Renter', id: 'LIST' },
        'Timeline',
      ],
    }),

    deleteLease: build.mutation<
      { id: string },
      ApartmentScope & { leaseId: string }
    >({
      query: ({ buildingId, floorId, apartmentId, leaseId }) => ({
        url: `/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/apartments/${encodeURIComponent(apartmentId)}/leases/${encodeURIComponent(leaseId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { apartmentId, leaseId }) => [
        { type: 'Lease', id: leaseId },
        { type: 'Lease', id: 'LIST' },
        { type: 'Apartment', id: apartmentId },
        { type: 'Apartment', id: 'LIST' },
        { type: 'Renter', id: 'LIST' },
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListLeasesQuery,
  useGetLeaseQuery,
  useCreateLeaseMutation,
  useUpdateLeaseMutation,
  useDeleteLeaseMutation,
} = leasesApi;
