'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { PasswordFieldsForm } from '@/components/password-fields-form';

export default function SetPasswordPage() {
  const router = useRouter();

  const handleSuccess = () => {
    toast.success('Password set! You’re all set.');
    router.replace('/dashboard');
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Panel - Hero Section */}
      <div className="relative hidden w-1/2 bg-gray-900 lg:flex lg:flex-col lg:justify-end">
        <div className="relative flex-1">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
            alt="Team collaboration"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-6 border-t-[5px] border-primary-base bg-gray-900 px-12.5 pb-15 pt-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center">
              <span className="text-2xl text-primary-base">✦</span>
            </div>
            <span className="text-xl font-semibold text-white">
              Bootcamp Starter
            </span>
          </div>

          <h1 className="text-5xl font-bold leading-[1.2] tracking-[-0.5px] text-white">
            Build your next project on a solid foundation.
          </h1>

          <p className="text-lg leading-normal text-white">
            A generic full-stack starter for your bootcamp project.
          </p>
        </div>
      </div>

      {/* Right Panel - Set Password Form */}
      <div className="relative flex w-full flex-col justify-between lg:w-1/2">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="flex w-full max-w-120 flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <h2 className="w-full text-2xl font-bold leading-[1.3] text-gray-900">
                Set your password
              </h2>
              <p className="text-sm font-medium leading-[1.6] text-gray-500">
                Create a password to finish setting up your account.
              </p>
            </div>

            <div className="w-78.75">
              <PasswordFieldsForm
                passwordLabel="Password"
                passwordPlaceholder="Create a password"
                submitLabel="Set Password"
                submittingLabel="Setting password..."
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm font-medium leading-[1.6]">
            <span className="text-gray-500">
              © {new Date().getFullYear()} Bootcamp Starter. All rights
              reserved.
            </span>
            <a
              href="/terms"
              className="text-gray-900 hover:text-primary-base hover:underline"
            >
              Terms & Conditions
            </a>
            <a
              href="/privacy"
              className="text-gray-900 hover:text-primary-base hover:underline"
            >
              Privacy Policy
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
