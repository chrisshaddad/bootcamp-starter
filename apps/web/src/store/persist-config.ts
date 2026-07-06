import storage from 'redux-persist/lib/storage';

import type { RootState } from './index';

export const PERSIST_VERSION = 2;

/**
 * Persistence config for Forward-Mena.
 *
 * Persisted slices:
 *   - ui: locale + theme preferences
 *   - auth: cached role/orgId for fast render before session resolves
 *
 * The RTK Query `api` slice is deliberately NOT persisted: a query entry
 * saved mid-flight (`status: 'pending'`) is restored on rehydrate with no
 * request actually in flight to resolve it, and RTK Query never dispatches
 * a replacement fetch for an already-tracked cache key — so the UI is stuck
 * showing the loading state forever with no network request visible. RTK
 * Query already re-fetches on mount per `refetchOnMountOrArgChange`, so
 * nothing is gained by persisting it across reloads.
 *
 * On version bump, the purge migration runs automatically clearing stale
 * state (this bump drops previously-persisted `api` cache from existing
 * users' browsers).
 */
export const persistConfig = {
  key: 'forward-mena',
  version: PERSIST_VERSION,
  storage,
  whitelist: ['ui', 'auth'] satisfies Array<keyof RootState>,
};
