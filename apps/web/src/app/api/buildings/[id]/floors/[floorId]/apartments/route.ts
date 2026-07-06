import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute(
  (params) => `/buildings/${params.id}/floors/${params.floorId}/apartments`,
);
export const POST = forwardRoute(
  (params) => `/buildings/${params.id}/floors/${params.floorId}/apartments`,
);
