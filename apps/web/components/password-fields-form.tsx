'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { passwordSchema } from '@repo/contracts';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

// Client-only schema: the API contract (setPasswordRequestSchema) takes just
// `password`; the confirmation field is validated on the client and stripped
// before the request.
const passwordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

// Visual-only strength indicator (0–4). Does NOT gate submission — the zod
// schema above remains the single source of truth for validity.
function strengthScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score;
}

interface PasswordFieldsFormProps {
  /** Label for the primary password field. */
  passwordLabel?: string;
  /** Placeholder for the primary password field. */
  passwordPlaceholder?: string;
  /** Text on the submit button in its idle state. */
  submitLabel: string;
  /** Text on the submit button while the request is in flight. */
  submittingLabel: string;
  /** Clear both fields after a successful submit (used by the settings form). */
  resetOnSuccess?: boolean;
  /** Called after the password is set/changed successfully. */
  onSuccess?: () => void;
}

export function PasswordFieldsForm({
  passwordLabel = 'Password',
  passwordPlaceholder = 'Input your password',
  submitLabel,
  submittingLabel,
  resetOnSuccess = false,
  onSuccess,
}: PasswordFieldsFormProps) {
  const { setPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
  });

  const score = strengthScore(watch('password') ?? '');

  const onSubmit = async (data: PasswordFormValues) => {
    setIsSubmitting(true);
    try {
      // Send only the contract field; confirmPassword is client-side only.
      await setPassword({ password: data.password });
      if (resetOnSuccess) {
        reset();
      }
      onSuccess?.();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="new-password"
          className="flex gap-0.5 text-[12.5px] font-semibold text-gray-900"
        >
          <span>{passwordLabel}</span>
          <span className="text-error">*</span>
        </Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            placeholder={passwordPlaceholder}
            aria-invalid={!!errors.password}
            className="pr-10"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="h-4.25 w-4.25" />
            ) : (
              <Eye className="h-4.25 w-4.25" />
            )}
          </button>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i < score ? 'bg-primary-base' : 'bg-gray-300',
              )}
            />
          ))}
        </div>
        {errors.password ? (
          <p className="text-sm text-error">{errors.password.message}</p>
        ) : (
          <p className="text-[11.5px] font-medium text-gray-500">
            Use 8+ characters with upper and lowercase letters and a number.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="confirm-password"
          className="flex gap-0.5 text-[12.5px] font-semibold text-gray-900"
        >
          <span>Confirm Password</span>
          <span className="text-error">*</span>
        </Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your password"
            aria-invalid={!!errors.confirmPassword}
            className="pr-10"
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirm ? (
              <EyeOff className="h-4.25 w-4.25" />
            ) : (
              <Eye className="h-4.25 w-4.25" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-error">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="h-12 w-full rounded-[11px] bg-primary-base text-[14.5px] font-bold tracking-[0.2px] text-white shadow-[0_8px_18px_-8px_rgba(39,163,118,0.7)] hover:bg-primary-hover disabled:opacity-60"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {submittingLabel}
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
