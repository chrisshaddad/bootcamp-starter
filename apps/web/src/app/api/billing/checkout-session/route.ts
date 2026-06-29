import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const POST = forwardRoute('/billing/checkout-session');
