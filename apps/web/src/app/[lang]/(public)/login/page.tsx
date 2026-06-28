import { redirect } from 'next/navigation';

import { auth } from '@/auth/auth';
import { dashboardPathForRole, normalizeRole } from '@/auth/roles';
import { isLocale, defaultLocale, type Locale } from '@/i18n/config';
import { LoginButton } from '@/components/auth/login-button';

type LoginPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { lang } = await params;
  const { callbackUrl, error } = await searchParams;

  if (!isLocale(lang)) {
    redirect(`/${defaultLocale}/login`);
  }

  const locale = lang as Locale;
  const session = await auth();
  const sessionExpired = session?.error === 'RefreshAccessTokenError';
  const role = normalizeRole(session?.user?.role ?? session?.role);

  // A session that failed token refresh still carries its old role. Treat it as
  // logged-out here, otherwise we'd bounce it to the dashboard and the middleware
  // would bounce it straight back → redirect loop (blank page).
  if (role && !sessionExpired) {
    redirect(dashboardPathForRole(role, locale));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center">
          Sign in to Forward Mena
        </h1>
        {error && (
          <p className="text-destructive text-sm text-center rounded border border-destructive/20 bg-destructive/5 p-3">
            {error === 'SessionExpired'
              ? 'Your session expired. Please sign in again.'
              : 'An error occurred. Please try again.'}
          </p>
        )}
        <LoginButton
          locale={locale}
          callbackUrl={callbackUrl ?? `/${locale}/dashboard`}
          label="Sign in with Keycloak"
        />
      </div>
    </main>
  );
}
