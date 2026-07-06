import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute((params) => `/buildings/${params.id}/floors`);
export const POST = forwardRoute((params) => `/buildings/${params.id}/floors`);
