import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute(
  (params) =>
    `/maintenance-requests/${params.id}/work-orders/${params.workOrderId}`,
);
