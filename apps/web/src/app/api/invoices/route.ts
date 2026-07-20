import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute('/invoices');
export const POST = forwardRoute('/invoices');
