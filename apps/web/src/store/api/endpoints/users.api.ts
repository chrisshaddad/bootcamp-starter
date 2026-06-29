import { baseApi } from '@/store/api/base-api';
import type {
  ApiEnvelope,
  CreateUserBody,
  MemberResponse,
  PatchUserBody,
} from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listUsers: build.query<MemberResponse[], void>({
      query: () => ({ url: '/users', method: 'GET' }),
      transformResponse: (
        response: MemberResponse[] | ApiEnvelope<MemberResponse[]>,
      ) => unwrap(response),
      providesTags: ['Membership'],
    }),

    createUser: build.mutation<MemberResponse, CreateUserBody>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      transformResponse: (
        response: MemberResponse | ApiEnvelope<MemberResponse>,
      ) => unwrap(response),
      // Creating a user provisions a new member and logs a timeline event
      invalidatesTags: ['Membership', 'Timeline'],
    }),

    patchUser: build.mutation<
      MemberResponse,
      { id: string; body: PatchUserBody }
    >({
      query: ({ id, body }) => ({
        url: `/users/${encodeURIComponent(id)}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (
        response: MemberResponse | ApiEnvelope<MemberResponse>,
      ) => unwrap(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Membership', id },
        'Membership',
        'Timeline',
      ],
    }),

    deleteUser: build.mutation<void, string>({
      query: (id) => ({
        url: `/users/${encodeURIComponent(id)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Membership', id },
        'Membership',
        'Timeline',
      ],
    }),
  }),
});

export const {
  useListUsersQuery,
  useCreateUserMutation,
  usePatchUserMutation,
  useDeleteUserMutation,
} = usersApi;
