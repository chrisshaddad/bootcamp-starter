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
      console.log(
        '[DEBUG] Onboarding Page - Profile already complete. Sending to /dashboard',
      );
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
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome aboard!</h1>
          <p className="text-muted-foreground mt-2">
            Let&apos;s get your profile set up so you can get started.
          </p>
        </div>
        <OnboardingWizard user={user} />
      </div>
    </div>
  );
}
