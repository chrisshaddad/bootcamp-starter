import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Margin brand mark — a violet gradient square with an upward-trend glyph.
 * Kept visually identical to the authenticated app sidebar so the identity
 * stays consistent across the marketing, auth, and app surfaces.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#936BFF] to-[#5B30D6]',
        className,
      )}
      aria-hidden
    >
      <TrendingUp className="size-4 text-white" strokeWidth={2.5} />
    </span>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          Margin
        </span>
      )}
    </span>
  );
}
