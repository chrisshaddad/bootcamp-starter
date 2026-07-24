import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Small status/label pill. `tone` maps to the app's semantic status roles
 * (see globals.css) so badges stay consistent wherever they appear. Prefer
 * this over hand-rolled `rounded-full … ring-1 ring-inset` spans.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium leading-tight ring-1 ring-inset transition-colors [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground ring-border',
        primary: 'bg-primary/10 text-primary ring-primary/20',
        success: 'bg-success/15 text-success-strong ring-success/25',
        warning: 'bg-warning/18 text-warning-strong ring-warning/30',
        danger: 'bg-destructive/12 text-destructive-strong ring-destructive/25',
        info: 'bg-info/15 text-info ring-info/25',
        violet: 'bg-violet/15 text-violet ring-violet/25',
        blush: 'bg-blush/15 text-blush-strong ring-blush/25',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

function Badge({
  className,
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ tone, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
