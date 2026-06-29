'use client';

/**
 * BillingFinalizing — pure presentational component.
 *
 * Rendered by the billing page when ?session_id=… is present in the URL.
 * Wave 3 wires the actual confirm logic:
 *   - POST /billing/confirm { sessionId }
 *   - session.update() to refresh the token
 *   - router.push(/{locale}/dashboard) on success
 *
 * Props:
 *   state   — "finalizing" | "success" | "error"
 *   locale  — "en" | "ar" (for RTL + copy)
 *   message — optional override for the subtitle text
 */

import { useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export type FinalizingState = 'finalizing' | 'success' | 'error';

type BillingFinalizingProps = {
  state: FinalizingState;
  locale: string;
  /** Optional override for secondary copy — Wave 3 can pass error details here */
  message?: string;
};

const COPY = {
  en: {
    finalizing: {
      title: 'Finalizing your subscription…',
      sub: 'Please stay on this page. This usually takes just a moment.',
    },
    success: {
      title: "You're all set.",
      sub: 'Entering your dashboard now…',
    },
    error: {
      title: 'Something went wrong.',
      sub: "We couldn't confirm your payment. Please try again or contact support.",
    },
  },
  ar: {
    finalizing: {
      title: 'جارٍ إتمام اشتراكك…',
      sub: 'يرجى البقاء على هذه الصفحة. يستغرق ذلك لحظة فقط.',
    },
    success: {
      title: 'كل شيء جاهز.',
      sub: 'جارٍ الانتقال إلى لوحة التحكم…',
    },
    error: {
      title: 'حدث خطأ ما.',
      sub: 'تعذّر تأكيد دفعتك. يرجى المحاولة مجدداً أو التواصل مع الدعم.',
    },
  },
} as const;

/** Gold spinner — CSS animation, respects prefers-reduced-motion via parent class */
function GoldSpinner() {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="block h-10 w-10 rounded-full border-2 border-[rgba(201,163,91,0.20)] border-t-[#C9A35B] animate-spin"
      style={{ animationDuration: '0.8s' }}
    />
  );
}

export function BillingFinalizing({
  state,
  locale,
  message,
}: BillingFinalizingProps) {
  const reduced = useReducedMotion();
  const isRtl = locale === 'ar';
  const copy = COPY[isRtl ? 'ar' : 'en'][state];
  const subText = message ?? copy.sub;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: '#0D1B2A' }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="flex flex-col items-center gap-6 text-center max-w-sm"
        style={{
          opacity: reduced ? 1 : undefined,
          animation: reduced
            ? undefined
            : 'fm-fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Icon / spinner */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          {state === 'finalizing' && <GoldSpinner />}

          {state === 'success' && (
            <CheckCircle2
              className="h-14 w-14"
              style={{ color: '#C9A35B' }}
              aria-hidden="true"
            />
          )}

          {state === 'error' && (
            <AlertCircle
              className="h-14 w-14"
              style={{ color: '#EF4444' }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#F5F0E8' }}
          >
            {copy.title}
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'rgba(245,240,232,0.52)' }}
          >
            {subText}
          </p>
        </div>

        {/* Gold hairline progress bar — shown only while finalizing */}
        {state === 'finalizing' && (
          <div
            className="h-px w-40 overflow-hidden rounded-full"
            style={{ background: 'rgba(201,163,91,0.15)' }}
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full"
              style={{
                background: '#C9A35B',
                width: '40%',
                animation: reduced
                  ? undefined
                  : 'fm-progress 1.4s ease-in-out infinite alternate',
              }}
            />
          </div>
        )}

        {/* Success ambient glow — purely decorative */}
        {state === 'success' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, rgba(201,163,91,0.08) 0%, transparent 70%)',
            }}
          />
        )}
      </div>

      {/* Keyframe definitions — scoped to this component's output */}
      <style>{`
        @keyframes fm-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fm-progress {
          from { width: 15%; }
          to   { width: 85%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-spin { animation: none; }
        }
      `}</style>
    </div>
  );
}
