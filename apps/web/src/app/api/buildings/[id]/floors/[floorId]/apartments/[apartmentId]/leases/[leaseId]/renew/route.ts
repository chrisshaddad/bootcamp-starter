import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const POST = forwardRoute(
  (params) =>
    `/buildings/${params.id}/floors/${params.floorId}/apartments/${params.apartmentId}/leases/${params.leaseId}/renew`,
);
