import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// App-level status badge. Intentionally lives outside `components/ui/` because
// it defines project-specific semantic variants (success / warning / critical)
// beyond what `npx shadcn add badge` generates — keeping the shadcn primitives
// folder free of hand-edited variants (see doc/AGENTS.md).
const statusBadgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-xs font-semibold transition-colors [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-base text-white',
        secondary: 'border-transparent bg-gray-100 text-gray-600',
        success: 'border-transparent bg-primary-100 text-primary-hover',
        warning: 'border-transparent bg-warn-soft text-warn',
        critical: 'border-transparent bg-critical-soft text-critical',
        outline: 'border-gray-200 text-gray-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function StatusBadge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof statusBadgeVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { StatusBadge, statusBadgeVariants };
