'use client';

import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { useQrToken } from '@/hooks/use-checkins';
import { useDashboard } from '@/hooks/use-dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, QrCode, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';

export default function QrCheckInPage() {
  const { qrToken, isLoading, error, mutate } = useQrToken();
  const { stats } = useDashboard();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!qrToken) return;

    const baseUrl = window.location.origin;
    const checkinUrl = `${baseUrl}/checkin?token=${qrToken.token}`;

    QRCode.toDataURL(
      checkinUrl,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrCodeDataUrl(url);
        }
      },
    );

    const expiryTime = new Date(qrToken.expiresAt).getTime();
    const calculateTimeLeft = () => {
      const diff = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) {
        mutate();
      }
    };

    calculateTimeLeft();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(calculateTimeLeft, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qrToken, mutate]);

  const handleManualRefresh = () => {
    mutate();
  };

  const occupancyPercent = stats
    ? Math.min(
        100,
        Math.round((stats.currentOccupancy / (stats.maxCapacity || 100)) * 100),
      )
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-6 md:p-12 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between z-10">
        <Link href="/checkins">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-900 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Check-ins
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Kiosk Mode Active
          </span>
        </div>
      </div>

      {/* Main Kiosk Area */}
      <div className="w-full max-w-md flex flex-col items-center gap-6 my-auto z-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            Self Check-In
          </h1>
          <p className="text-sm text-slate-400 max-w-sm">
            Scan the QR code below with your phone&apos;s camera to check into
            the gym.
          </p>
        </div>

        {/* QR Display Card */}
        <div className="relative group w-full">
          {/* Card Border glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-1000" />

          <Card className="relative bg-slate-900/90 border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
            <CardContent className="flex flex-col items-center p-8 space-y-6">
              {/* QR Image Container */}
              <div className="relative p-4 bg-white rounded-xl shadow-inner border border-slate-700/50 flex items-center justify-center w-72 h-72">
                {!qrCodeDataUrl || (isLoading && !error) ? (
                  <div className="flex flex-col items-center justify-center space-y-3 text-slate-800">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="text-xs font-medium text-slate-500">
                      Generating Secure Key...
                    </span>
                  </div>
                ) : error ? (
                  <div className="text-center text-rose-500 p-4">
                    <span className="text-sm font-semibold">
                      Failed to fetch token
                    </span>
                    <Button
                      size="sm"
                      onClick={handleManualRefresh}
                      className="mt-2 block mx-auto bg-slate-900 text-white"
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <img
                    src={qrCodeDataUrl}
                    alt="Check-in QR Code"
                    className="w-full h-full object-contain rounded-lg select-none pointer-events-none transition-opacity duration-300"
                  />
                )}

                {/* Overlaid Countdown */}
                <div className="absolute bottom-2 right-2 bg-slate-950/90 border border-slate-800 text-white px-2 py-1 rounded-md text-[10px] font-mono tracking-wider flex items-center gap-1.5 shadow-md">
                  <div className="relative w-2.5 h-2.5">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="5"
                        cy="5"
                        r="4"
                        stroke="#334155"
                        strokeWidth="1.5"
                        fill="transparent"
                      />
                      <circle
                        cx="5"
                        cy="5"
                        r="4"
                        stroke="#8b5cf6"
                        strokeWidth="1.5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 4}
                        strokeDashoffset={2 * Math.PI * 4 * (1 - timeLeft / 60)}
                      />
                    </svg>
                  </div>
                  <span>{timeLeft}s</span>
                </div>
              </div>

              {/* Secure Token Info */}
              <div className="w-full flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-4">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Dynamic Security Key</span>
                </div>
                <button
                  onClick={handleManualRefresh}
                  disabled={isLoading}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`}
                  />
                  <span>Rotate</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live occupancy status inside the kiosk */}
        {stats && (
          <div className="w-full bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Current Occupancy</p>
                <p className="font-bold text-white">
                  {stats.currentOccupancy} / {stats.maxCapacity || '∞'}
                </p>
              </div>
            </div>
            {stats.maxCapacity && (
              <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    occupancyPercent > 85 ? 'bg-rose-500' : 'bg-violet-500'
                  }`}
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full max-w-5xl text-center text-xs text-slate-500 z-10 mt-6 border-t border-slate-900 pt-6">
        <p className="flex items-center justify-center gap-1.5">
          <QrCode className="h-3 w-3" />
          <span>Codes auto-refresh every 15 seconds for your protection.</span>
        </p>
      </div>
    </div>
  );
}
