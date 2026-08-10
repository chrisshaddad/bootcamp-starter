'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-auth';
import { isProfileComplete } from '@/lib/profile';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const { user, isLoading } = useUser({ redirectOnUnauthenticated: true });
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && isProfileComplete(user)) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || isProfileComplete(user)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-muted/30 px-4 py-8 sm:justify-center sm:p-8">
      <div className="w-full min-w-0 max-w-xl">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome aboard!
          </h1>
          <p className="text-muted-foreground mt-2">
            Let&apos;s get your profile set up so you can get started.
          </p>
        </div>
        <OnboardingWizard user={user} />
      </div>
    </div>
  );
}
