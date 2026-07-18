import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CoordlyLogoProps {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
}

export function CoordlyLogo({
  className,
  markClassName,
  wordmarkClassName,
  showWordmark = true,
}: CoordlyLogoProps) {
  return (
    <span
      aria-label="Coordly"
      className={cn('inline-flex items-center gap-2.5', className)}
    >
      <Image
        src="/coordly-mark.svg"
        alt=""
        width={32}
        height={32}
        className={cn('size-8 shrink-0', markClassName)}
      />
      {showWordmark && (
        <span
          className={cn(
            'text-xl font-semibold text-gray-900',
            wordmarkClassName,
          )}
        >
          Coordly
        </span>
      )}
    </span>
  );
}
