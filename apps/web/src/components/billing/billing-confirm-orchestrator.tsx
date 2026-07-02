'use client';

/**
 * BillingConfirmOrchestrator
 *
 * Rendered by /billing?session_id=… (RSC passes sessionId as a prop).
 *
 * Flow:
 *   1. Mount → show BillingFinalizing state="finalizing"
 *   2. Call POST /billing/confirm { sessionId } via RTK confirmCheckoutSession
 *      (idempotent: activates the org → status ACTIVE, and assigns org_admin in
 *      Keycloak — the authoritative "has paid" signal).
 *   3a. 402 "not yet paid" → retry up to MAX_RETRIES times with RETRY_DELAY_MS backoff
 *   3b. Success →
 *       - setState("success")
 *       - Try ONE in-place updateSession({refresh}) (fast path). If it surfaces
 *         the role → redirect to /dashboard.
 *       - If the refresh did NOT surface the role (the refresh_token grant is
 *         unreliable at picking up a just-granted role here), re-mint the token
 *         via a SILENT fresh OIDC login (signIn) — the SSO session is alive, so
 *         no login form appears, and a fresh login always carries current roles.
 *         Either way the dashboard loads as org_admin.
 *       - Note: access never depends on this anyway — the dashboard RSC gates on
 *         org.status === ACTIVE (token-independent), so a paid user can never be
 *         stranded. That is why there is no longer a "couldn't activate" failure.
 *   3c. Terminal error → state="error" only for a GENUINE confirm failure
 *       (payment not paid after retries, forbidden, network), with a retry button.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';

import { useConfirmCheckoutSessionMutation } from '@/store/api/endpoints/billing.api';
import {
  BillingFinalizing,
  type FinalizingState,
} from '@/components/billing/billing-finalizing';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type Props = {
  sessionId: string;
  locale: string;
};

export function BillingConfirmOrchestrator({ sessionId, locale }: Props) {
  const { update: updateSession } = useSession();

  const [confirmCheckout] = useConfirmCheckoutSessionMutation();

  const [state, setState] = useState<FinalizingState>('finalizing');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );

  // Guard: run confirm logic only once on mount (StrictMode safe)
  const started = useRef(false);

  const runConfirm = useCallback(async () => {
    setState('finalizing');
    setErrorMessage(undefined);

    let attempt = 0;

    while (attempt <= MAX_RETRIES) {
      try {
        const result = await confirmCheckout({ sessionId });

        if ('data' in result && result.data) {
          // Payment confirmed: the org is now ACTIVE (DB) and org_admin is
          // assigned in Keycloak.
          setState('success');

          // Fast path: try an in-place token refresh. update() MUST carry a
          // payload so next-auth POSTs to the session endpoint (jwt callback
          // trigger "update" → Keycloak refresh). Because the refresh result and
          // the session cookie are written in the SAME request, refreshed.role
          // is a reliable signal of whether the new role actually landed.
          let refreshed: Awaited<ReturnType<typeof updateSession>> = null;
          try {
            refreshed = await updateSession({ refresh: Date.now() });
          } catch {
            refreshed = null;
          }

          // Brief pause so the user reads the success state, then navigate.
          await sleep(600);

          if (refreshed?.role) {
            // Refresh surfaced the role — straight to the dashboard.
            window.location.href = `/${locale}/dashboard`;
          } else {
            // The refresh_token grant did NOT surface the freshly-granted role
            // (a known-unreliable path with this Keycloak/next-auth combo). Re-
            // mint the token via a fresh OIDC login instead: the Keycloak SSO
            // session is still active, so this is silent (no login form), and a
            // fresh authorization_code grant ALWAYS reflects current role
            // mappings — the same mechanism as the manual logout/login that
            // reliably works. This guarantees the dashboard loads as org_admin
            // and that backend @Roles-gated calls succeed immediately.
            await signIn('keycloak', { callbackUrl: `/${locale}/dashboard` });
          }
          return;
        }

        // RTK error
        const err = 'error' in result ? result.error : undefined;
        const status =
          err && typeof err === 'object' && 'status' in err
            ? (err as { status: number }).status
            : 0;

        if (status === 402 && attempt < MAX_RETRIES) {
          // Payment not yet confirmed on backend — wait and retry
          attempt++;
          await sleep(RETRY_DELAY_MS);
          continue;
        }

        // Non-402 error or exhausted retries
        const message =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : undefined;
        setState('error');
        setErrorMessage(message);
        return;
      } catch {
        if (attempt < MAX_RETRIES) {
          attempt++;
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        setState('error');
        return;
      }
    }

    // All retries exhausted
    setState('error');
  }, [sessionId, confirmCheckout, updateSession, locale]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runConfirm();
  }, [runConfirm]);

  const isRtl = locale === 'ar';

  return (
    <div>
      <BillingFinalizing state={state} locale={locale} message={errorMessage} />
      {state === 'error' && (
        <div
          className="flex justify-center mt-6 pb-12"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <button
            type="button"
            onClick={() => {
              started.current = false;
              void runConfirm();
            }}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A35B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
            style={{ background: '#C9A35B', color: '#0D1B2A' }}
          >
            {isRtl ? 'حاول مجدداً' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
}
