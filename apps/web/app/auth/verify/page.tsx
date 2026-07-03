'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { AuthCanvas } from '@/components/auth/auth-shell';
import { AuthCard } from '@/components/auth/auth-card';

type VerifyStatus = 'loading' | 'success' | 'error';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyMagicLink } = useAuth();
  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid or missing token');
      return;
    }

    const verify = async () => {
      try {
        const { user } = await verifyMagicLink({ token });
        setStatus('success');
        toast.success('Successfully logged in!');
        // Invited staff (PENDING) must set a password before continuing;
        // everyone else goes straight to the dashboard.
        const destination =
          user.status === 'PENDING' ? '/auth/set-password' : '/dashboard';
        // Small delay to show success state before redirecting
        setTimeout(() => {
          router.replace(destination);
        }, 1000);
      } catch (error) {
        setStatus('error');
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
          toast.error(error.message);
        } else {
          setErrorMessage('Verification failed. Please try again.');
          toast.error('Verification failed. Please try again.');
        }
      }
    };

    verify();
  }, [searchParams, verifyMagicLink, router]);

  return (
    <AuthCanvas>
      <AuthCard className="text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-base">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h3 className="mb-2 text-lg font-extrabold text-gray-900">
              Verifying your magic link…
            </h3>
            <p className="text-sm font-medium leading-relaxed text-gray-600">
              Hang tight while we sign you in.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-base">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-lg font-extrabold text-gray-900">
              You&apos;re verified!
            </h3>
            <p className="text-sm font-medium leading-relaxed text-gray-600">
              Taking you to your dashboard…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-light text-error">
              <XCircle className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-lg font-extrabold text-gray-900">
              Verification failed
            </h3>
            <p className="text-sm font-medium leading-relaxed text-gray-600">
              {errorMessage}
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block text-sm font-bold text-primary-base hover:underline"
            >
              Back to login
            </Link>
          </>
        )}
      </AuthCard>
    </AuthCanvas>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <AuthCanvas>
          <AuthCard className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-base">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          </AuthCard>
        </AuthCanvas>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
