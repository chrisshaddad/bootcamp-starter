'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

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
        await verifyMagicLink({ token });
        setStatus('success');
        toast.success('Successfully logged in!');
        // Small delay to show success state before redirecting
        setTimeout(() => {
          router.replace('/dashboard');
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
    <div className="rounded-2xl border border-border bg-card p-7 text-center ring-1 ring-foreground/5">
      {status === 'loading' && (
        <>
          <Loader2 className="mx-auto size-12 animate-spin text-primary-300" />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">
            Verifying your magic link…
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please wait while we log you in.
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="mx-auto size-12 text-success" />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">
            Successfully verified!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting to your dashboard…
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="mx-auto size-12 text-destructive" />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">
            Verification failed
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
          <Button variant="outline" size="lg" className="mt-6 w-full" asChild>
            <Link href="/login">Back to login</Link>
          </Button>
        </>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-border bg-card p-7 text-center ring-1 ring-foreground/5">
            <Loader2 className="mx-auto size-12 animate-spin text-primary-300" />
          </div>
        }
      >
        <VerifyContent />
      </Suspense>
    </AuthShell>
  );
}
