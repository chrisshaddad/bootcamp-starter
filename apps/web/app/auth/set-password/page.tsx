'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PasswordFieldsForm } from '@/components/password-fields-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthShowcase } from '@/components/auth/auth-showcase';

export default function SetPasswordPage() {
  const router = useRouter();

  const handleSuccess = () => {
    toast.success('Password set! You’re all set.');
    router.replace('/dashboard');
  };

  return (
    <AuthShell
      showcase={
        <AuthShowcase
          headline={
            <>
              One step from{' '}
              <span className="text-primary-base">going live.</span>
            </>
          }
          subhead="Set a password and your team can start tracking stock across every branch."
        />
      }
    >
      <AuthCard>
        <h2 className="mb-1.5 text-[22px] font-extrabold tracking-[-0.4px] text-gray-900">
          Set your password
        </h2>
        <p className="mb-5 text-[13.5px] font-medium leading-snug text-gray-600">
          Create a password to finish setting up your account.
        </p>
        <PasswordFieldsForm
          passwordLabel="New Password"
          passwordPlaceholder="Create a password"
          submitLabel="Set Password"
          submittingLabel="Setting password..."
          onSuccess={handleSuccess}
        />
      </AuthCard>
    </AuthShell>
  );
}
