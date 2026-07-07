'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useScanCheckIn } from '@/hooks/use-me';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { ApiError } from '@/lib/api';

/** Member landing page for processing QR check-ins */
export default function MemberCheckInLandingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const { scanCheckIn } = useScanCheckIn();

  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No check-in token found. Please scan a valid QR code.');
      return;
    }

    let isMounted = true;

    async function processCheckIn() {
      setStatus('loading');
      try {
        await scanCheckIn(token!);
        if (isMounted) {
          setStatus('success');
        }
      } catch (err) {
        if (isMounted) {
          setStatus('error');
          setErrorMsg(
            err instanceof ApiError
              ? err.message
              : 'Failed to process check-in. The QR code might have expired.',
          );
        }
      }
    }

    processCheckIn();

    return () => {
      isMounted = false;
    };
  }, [token, scanCheckIn]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-violet-500/10 rounded-xl text-violet-400 mb-2">
            <QrCode className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gym Check-in</h1>
          <p className="text-sm text-slate-400">
            Secure member check-in service
          </p>
        </div>

        <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-8 text-center min-h-[280px] flex flex-col items-center justify-center space-y-6">
            {status === 'loading' && (
              <div className="space-y-4 flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-violet-500" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">
                    Validating QR Token
                  </p>
                  <p className="text-xs text-slate-400">
                    Communicating with gym servers...
                  </p>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-6 flex flex-col items-center w-full animate-in fade-in zoom-in duration-300">
                <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-16 w-16" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">
                    Check-in Successful!
                  </h2>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">
                    Welcome to the gym! Your check-in has been registered
                    successfully.
                  </p>
                </div>
                <Link href="/portal" className="w-full pt-4">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                    Go to Portal Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-6 flex flex-col items-center w-full animate-in fade-in zoom-in duration-300">
                <div className="p-1 rounded-full bg-rose-500/20 text-rose-400">
                  <XCircle className="h-16 w-16" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">
                    Check-in Failed
                  </h2>
                  <p className="text-sm text-rose-200 bg-rose-950/30 border border-rose-900/30 px-4 py-2.5 rounded-lg max-w-xs mx-auto text-center font-medium">
                    {errorMsg}
                  </p>
                </div>
                <div className="w-full pt-4 flex flex-col gap-2">
                  {token && (
                    <Button
                      onClick={() => router.refresh()}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      Try Again
                    </Button>
                  )}
                  <Link href="/portal" className="w-full">
                    <Button
                      variant="ghost"
                      className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      Go to Portal Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
