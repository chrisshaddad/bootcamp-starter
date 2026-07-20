import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const POST = forwardRoute((params) => `/notifications/${params.id}/read`);
