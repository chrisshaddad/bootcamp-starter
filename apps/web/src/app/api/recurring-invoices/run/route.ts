import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

// F3.1 — org_admin "generate rent invoices now" trigger. Also runs daily via the
// backend BullMQ scheduler; this is the on-demand path (and the verify hook).
export const POST = forwardRoute('/recurring-invoices/run');
