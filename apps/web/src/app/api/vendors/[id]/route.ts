import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const PATCH = forwardRoute((params) => `/vendors/${params.id}`);
export const DELETE = forwardRoute((params) => `/vendors/${params.id}`);
