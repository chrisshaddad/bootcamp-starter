import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute((params) => `/invoice-payments/${params.id}`);
export const DELETE = forwardRoute(
  (params) => `/invoice-payments/${params.id}`,
);
