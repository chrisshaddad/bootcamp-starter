import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const PATCH = forwardRoute(
  (params) => `/maintenance-requests/${params.id}`,
);
export const DELETE = forwardRoute(
  (params) => `/maintenance-requests/${params.id}`,
);
