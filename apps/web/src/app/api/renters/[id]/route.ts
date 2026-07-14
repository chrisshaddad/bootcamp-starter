import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute((params) => `/renters/${params.id}`);
export const PATCH = forwardRoute((params) => `/renters/${params.id}`);
export const DELETE = forwardRoute((params) => `/renters/${params.id}`);
