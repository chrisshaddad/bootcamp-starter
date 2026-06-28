import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute('/buildings');
export const POST = forwardRoute('/buildings');
