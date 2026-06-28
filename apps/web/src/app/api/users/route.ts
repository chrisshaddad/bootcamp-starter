import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

export const GET = forwardRoute('/users');
export const POST = forwardRoute('/users');
