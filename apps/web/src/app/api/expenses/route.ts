import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute('/expenses');
export const POST = forwardRoute('/expenses');
