import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute(
  (params) =>
    `/buildings/${params.id}/floors/${params.floorId}/apartments/${params.apartmentId}/leases/${params.leaseId}`,
);
export const PATCH = forwardRoute(
  (params) =>
    `/buildings/${params.id}/floors/${params.floorId}/apartments/${params.apartmentId}/leases/${params.leaseId}`,
);
export const DELETE = forwardRoute(
  (params) =>
    `/buildings/${params.id}/floors/${params.floorId}/apartments/${params.apartmentId}/leases/${params.leaseId}`,
);
