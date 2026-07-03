import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Shared white form card that floats on the auth canvas.
export function AuthCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full max-w-[410px] rounded-[20px] border border-[#e2ede7] bg-white p-7 shadow-[0_24px_60px_-20px_rgba(20,83,60,0.28),0_6px_16px_rgba(17,24,39,0.06)] sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  );
}
