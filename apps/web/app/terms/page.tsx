import Link from 'next/link';
import { AuthCanvas } from '@/components/auth/auth-shell';
import { AuthCard } from '@/components/auth/auth-card';

export default function TermsPage() {
  return (
    <AuthCanvas>
      <AuthCard className="text-center">
        <h1 className="mb-2 text-lg font-extrabold text-gray-900">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm font-medium leading-relaxed text-gray-600">
          Our full Terms &amp; Conditions are being finalized. In the meantime,
          reach out to your MedFind Lebanon administrator with any questions.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-bold text-primary-base hover:underline"
        >
          Back to login
        </Link>
      </AuthCard>
    </AuthCanvas>
  );
}
