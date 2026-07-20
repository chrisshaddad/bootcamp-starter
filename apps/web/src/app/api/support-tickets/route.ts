import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute('/support-tickets');
export const POST = forwardRoute('/support-tickets');
