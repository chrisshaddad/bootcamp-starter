import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute('/vendors');
export const POST = forwardRoute('/vendors');
