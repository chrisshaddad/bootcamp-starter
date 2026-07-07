import { mutate } from 'swr';

/**
 * Revalidate every SWR entry whose string key starts with `prefix`.
 *
 * Call this after a create / update / delete so all list and detail views for a
 * resource refetch. SWR keys in this app are bare endpoint strings (see
 * `lib/swr-provider.tsx`), so the prefix is the resource's base path.
 *
 * @example
 * await apiPost('/authors', data);
 * await invalidateByPrefix('/authors');
 */
export function invalidateByPrefix(prefix: string) {
  return mutate(
    (key) => typeof key === 'string' && key.startsWith(prefix),
    undefined,
    { revalidate: true },
  );
}
