import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const PUT = forwardRoute(
  (params) => `/buildings/${params.id}/assignments`,
);
