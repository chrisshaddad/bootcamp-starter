import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const PATCH = forwardRoute((params) => `/expenses/${params.id}`);
export const DELETE = forwardRoute((params) => `/expenses/${params.id}`);
