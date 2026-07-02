'use client';

import { useTransition } from 'react';
import { signIn } from 'next-auth/react';

type LoginButtonProps = {
  locale: string;
  callbackUrl: string;
  label: string;
};

export function LoginButton({ locale, callbackUrl, label }: LoginButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleSignIn() {
    startTransition(async () => {
      await signIn(
        'keycloak',
        { callbackUrl },
        { ui_locales: locale, kc_locale: locale },
      );
    });
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isPending}
      className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {isPending ? 'Redirecting…' : label}
    </button>
  );
}
