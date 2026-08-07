'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { signupRequestSchema, type SignupRequest } from '@repo/contracts';
import { AuthShell } from '@/components/auth-shell';
import { PasswordInput } from '@/components/password-input';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'HIRING', label: 'Recruiter / Hiring' },
] as const;

export default function SignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { signup, requestMagicLink } = useAuth();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupRequest>({
    resolver: zodResolver(signupRequestSchema),
    defaultValues: { accountType: 'DEVELOPER' },
    shouldUnregister: true,
  });

  const onSubmit = async (data: SignupRequest) => {
    setIsSubmitting(true);
    try {
      await signup(data);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Unable to sign up',
      );
      setIsSubmitting(false);
      return;
    }

    try {
      await requestMagicLink({ email: data.email });
    } catch {
      // Account was already created; a failed confirmation email shouldn't block the user.
    }

    toast.success(
      'Account created! Please check your email to verify your account.',
    );
    router.push('/login');
    setIsSubmitting(false);
  };

  return (
    <AuthShell
      title="Create your account"
      description="Start showcasing your engineering work on Deployfolio."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label>I am a...</Label>
          <Controller
            name="accountType"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={
                      field.value === option.value ? 'default' : 'outline'
                    }
                    className="h-10"
                    aria-pressed={field.value === option.value}
                    onClick={() => field.onChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
