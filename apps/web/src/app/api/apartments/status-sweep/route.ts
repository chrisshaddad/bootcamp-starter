import { forwardRoute } from '@/lib/api/forward';

export const runtime = 'nodejs';

// F4.2 — org_admin on-demand apartment-status expiry sweep. Also runs daily via
// the backend scheduler; this is the on-demand path (and the verify hook).
export const POST = forwardRoute('/apartments/status-sweep');
