import { baseApi } from '@/store/api/base-api';
import type { ApiEnvelope, OrgResponse, PatchOrgBody } from '@/types/api';

function unwrap<TData>(response: TData | ApiEnvelope<TData>): TData {
  return response && typeof response === 'object' && 'data' in response
    ? (response as ApiEnvelope<TData>).data
    : (response as TData);
}

export const orgApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOrg: build.query<OrgResponse, void>({
      query: () => ({ url: '/org', method: 'GET' }),
      transformResponse: (response: OrgResponse | ApiEnvelope<OrgResponse>) =>
        unwrap(response),
      providesTags: ['Org', 'Subscription'],
    }),

    patchOrg: build.mutation<OrgResponse, PatchOrgBody>({
      query: (body) => ({ url: '/org', method: 'PATCH', body }),
      transformResponse: (response: OrgResponse | ApiEnvelope<OrgResponse>) =>
        unwrap(response),
      invalidatesTags: ['Org', 'Me'],
    }),
  }),
});

export const { useGetOrgQuery, usePatchOrgMutation } = orgApi;
