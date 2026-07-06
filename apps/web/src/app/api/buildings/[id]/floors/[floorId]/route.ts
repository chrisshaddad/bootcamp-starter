import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute(
  (params) => `/buildings/${params.id}/floors/${params.floorId}`,
);
export const PATCH = forwardRoute(
  (params) => `/buildings/${params.id}/floors/${params.floorId}`,
);
export const DELETE = forwardRoute(
  (params) => `/buildings/${params.id}/floors/${params.floorId}`,
);
