import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const PATCH = forwardRoute((params) => `/users/${params.id}`);
export const DELETE = forwardRoute((params) => `/users/${params.id}`);
