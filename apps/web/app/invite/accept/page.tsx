'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';

type AcceptStatus = 'loading' | 'success' | 'error';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { acceptMemberInvitation } = useAuth();
  const [status, setStatus] = useState<AcceptStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid or missing invitation token');
      return;
    }

    const accept = async () => {
      try {
        await acceptMemberInvitation({ token });
        setStatus('success');
        toast.success('Invitation accepted');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1000);
      } catch (error) {
        setStatus('error');
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
          toast.error(error.message);
        } else {
          setErrorMessage('Invitation could not be accepted.');
          toast.error('Invitation could not be accepted.');
        }
      }
    };

    accept();
  }, [acceptMemberInvitation, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary-base" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              Accepting invitation...
            </h1>
            <p className="mt-2 text-muted-foreground">
              Please wait while we set up your access.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary-base" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              Invitation accepted
            </h1>
            <p className="mt-2 text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              Invitation failed
            </h1>
            <p className="mt-2 text-muted-foreground">{errorMessage}</p>
            <a
              href="/login"
              className="mt-4 inline-block text-primary-base hover:underline"
            >
              Back to login
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary-base" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
