export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold text-destructive">
        Authentication Error
      </h1>
      <p className="text-muted-foreground">
        {error ?? 'An authentication error occurred. Please try again.'}
      </p>
      <a
        href="/en/login"
        className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
      >
        Return to sign in
      </a>
    </main>
  );
}
