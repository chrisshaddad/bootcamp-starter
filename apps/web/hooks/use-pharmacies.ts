'use client';

import useSWR from 'swr';
import type { PharmacyListResponse, PharmacyOption } from '@repo/contracts';

interface UsePharmaciesReturn {
  pharmacies: PharmacyOption[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * All pharmacies, for selection dropdowns. Revalidates on mount and on window
 * focus so the list stays current — a pharmacy added elsewhere shows up the
 * next time a dialog opens or the tab is refocused, without a manual reload.
 */
export function usePharmacies(enabled = true): UsePharmaciesReturn {
  const { data, error, isLoading } = useSWR<PharmacyListResponse>(
    enabled ? '/pharmacies' : null,
    {
      revalidateOnMount: true,
      revalidateOnFocus: true,
      revalidateIfStale: true,
    },
  );

  return { pharmacies: data?.pharmacies, isLoading, error };
}
