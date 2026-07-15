import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute('/invoice-payments');
export const POST = forwardRoute('/invoice-payments');
