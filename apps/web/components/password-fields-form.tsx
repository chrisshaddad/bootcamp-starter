'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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

interface PasswordFieldsFormProps {
  /** Label for the primary password field. */
  passwordLabel?: string;
  /** Placeholder for the primary password field. */
  passwordPlaceholder?: string;
  /** Text on the submit button in its idle state. */
  submitLabel: string;
  /** Text on the submit button while the request is in flight. */
  submittingLabel: string;
  /** Extra classes for the submit button (overrides the default styling). */
  buttonClassName?: string;
  /** Clear both fields after a successful submit (used by the settings form). */
  resetOnSuccess?: boolean;
  /** Called after the password is set/changed successfully. */
  onSuccess?: () => void;
}

const DEFAULT_BUTTON_CLASS =
  'h-14 w-full rounded-[10px] bg-gray-900 text-base font-bold leading-normal tracking-[0.3px] text-white hover:bg-gray-900/90 disabled:bg-gray-200 disabled:text-gray-500';

export function PasswordFieldsForm({
  passwordLabel = 'Password',
  passwordPlaceholder = 'Input your password',
  submitLabel,
  submittingLabel,
  buttonClassName,
  resetOnSuccess = false,
  onSuccess,
}: PasswordFieldsFormProps) {
  const { setPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
  });

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
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
      <div className="flex flex-col gap-2.5">
        <Label
          htmlFor="new-password"
          className="flex gap-0.5 text-sm font-medium leading-[1.6] text-gray-900"
        >
          <span>{passwordLabel}</span>
          <span className="text-error">*</span>
        </Label>
        <Input
          id="new-password"
          type="password"
          placeholder={passwordPlaceholder}
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-error">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <Label
          htmlFor="confirm-password"
          className="flex gap-0.5 text-sm font-medium leading-[1.6] text-gray-900"
        >
          <span>Confirm Password</span>
          <span className="text-error">*</span>
        </Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Re-enter your password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-error">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className={cn(DEFAULT_BUTTON_CLASS, buttonClassName)}
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
