import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Container that staggers the entrance animation of its direct children.
 * Each child fades and slides up with an incremental delay (60ms per item).
 */
export function AnimateStagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('animate-stagger', className)}>{children}</div>;
}
