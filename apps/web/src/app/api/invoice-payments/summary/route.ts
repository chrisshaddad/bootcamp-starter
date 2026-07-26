import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

// Static segment — Next resolves it ahead of the sibling [id] route.
export const GET = forwardRoute('/invoice-payments/summary');
