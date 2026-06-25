'use client';

import { SWRConfig } from 'swr';
import { useRouter, usePathname } from 'next/navigation';
import { fetcher, ApiError } from '@/lib/api';

interface SWRProviderProps {
  children: React.ReactNode;
}

const AUTH_ROUTES = ['/login', '/auth', '/suspended'];
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

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
