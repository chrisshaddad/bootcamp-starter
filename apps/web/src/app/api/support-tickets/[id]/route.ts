import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute((params) => `/support-tickets/${params.id}`);
export const PATCH = forwardRoute((params) => `/support-tickets/${params.id}`);
