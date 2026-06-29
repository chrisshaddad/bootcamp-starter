'use client';

import { SWRConfig } from 'swr';
import { useRouter, usePathname } from 'next/navigation';
import { fetcher, ApiError } from '@/lib/api';
import { isAuthRoute } from '@/lib/auth-routes';

interface SWRProviderProps {
  children: React.ReactNode;
}

/** Auto-generated docstring */
export function SWRProvider({ children }: SWRProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        onError: (err) => {
          if (
            err instanceof ApiError &&
            err.status === 401 &&
            !isAuthRoute(pathname)
          ) {
            router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          }
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
