'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-auth';
import { usePatientMe } from '@/hooks/use-patients';
import { ForbiddenPage } from '@/components/forbidden-page';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TABS = [
  { title: 'Profile', href: '/portal' },
  { title: 'Care Team', href: '/portal/care-team' },
  { title: 'Records', href: '/portal/records' },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading: userLoading } = useUser();
  const isPatient = user?.role === 'PATIENT';

  const { patient, isLoading, error } = usePatientMe({ enabled: isPatient });

  if (userLoading || (isPatient && isLoading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isPatient) {
    return (
      <ForbiddenPage message="The patient portal is only available to patients." />
    );
  }

  if (error || !patient) {
    return (
      <div className="py-10 text-center text-error">
        Failed to load your record
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile, care team, and medical records
        </p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active =
            tab.href === '/portal'
              ? pathname === '/portal'
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'rounded-t-md px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-b-2 border-primary-base text-primary-base'
                  : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.title}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
