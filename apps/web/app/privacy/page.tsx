import Link from 'next/link';
import { AuthCanvas } from '@/components/auth/auth-shell';
import { AuthCard } from '@/components/auth/auth-card';

export default function PrivacyPage() {
  return (
    <AuthCanvas>
      <AuthCard className="text-center">
        <h1 className="mb-2 text-lg font-extrabold text-gray-900">
          Privacy Policy
        </h1>
        <p className="text-sm font-medium leading-relaxed text-gray-600">
          Our full Privacy Policy is being finalized. In the meantime, reach out
          to your MedFind Lebanon administrator with any questions about how
          your data is handled.
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
