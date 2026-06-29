import storage from 'redux-persist/lib/storage';

import type { RootState } from './index';

export const PERSIST_VERSION = 1;

/**
 * Persistence config for Forward-Mena.
 *
 * Persisted slices:
 *   - ui: locale + theme preferences
 *   - auth: cached role/orgId for fast render before session resolves
 *   - api: RTK Query cache (revalidated on rehydrate via refetchOnMountOrArgChange)
 *
 * On version bump, the purge migration runs automatically clearing stale state.
 */
export const persistConfig = {
  key: 'forward-mena',
  version: PERSIST_VERSION,
  storage,
  whitelist: ['ui', 'auth', 'api'] satisfies Array<keyof RootState>,
};
