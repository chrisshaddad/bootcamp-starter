import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute((params) => `/invoices/${params.id}`);
export const PATCH = forwardRoute((params) => `/invoices/${params.id}`);
export const DELETE = forwardRoute((params) => `/invoices/${params.id}`);
