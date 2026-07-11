import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute(
  (params) =>
    `/maintenance-requests/${params.id}/work-orders/${params.workOrderId}`,
);
export const PATCH = forwardRoute(
  (params) =>
    `/maintenance-requests/${params.id}/work-orders/${params.workOrderId}`,
);
export const DELETE = forwardRoute(
  (params) =>
    `/maintenance-requests/${params.id}/work-orders/${params.workOrderId}`,
);
