'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (user && user.accountType !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [router, user]);

  if (isLoading || user?.accountType !== 'SUPER_ADMIN') {
    return <Skeleton className="h-[520px] w-full rounded-xl" />;
  }

  return children;
}
