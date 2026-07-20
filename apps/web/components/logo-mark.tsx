import { cn } from '@/lib/utils';

/**
 * Fieldhouse brand mark: an abstract lifter pictogram (head, torso, split
 * stance, arms raised to a barbell) in the style of sport pictograms, not a
 * literal illustrated figure. White-on-garnet badge, sized to match the
 * h-8 w-8 slot it replaces everywhere the old placeholder star icon lived.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-base',
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        className="h-6 w-6"
        fill="none"
        stroke="white"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* barbell */}
        <line x1="6" y1="8" x2="42" y2="8" />
        <rect
          x="3"
          y="2.5"
          width="6"
          height="11"
          rx="1.5"
          fill="white"
          stroke="none"
        />
        <rect
          x="39"
          y="2.5"
          width="6"
          height="11"
          rx="1.5"
          fill="white"
          stroke="none"
        />
        {/* lifter */}
        <circle cx="24" cy="15" r="4.6" fill="white" stroke="none" />
        <path d="M13 8 L24 21 L35 8" />
        <line x1="24" y1="21" x2="24" y2="31" />
        <path d="M16 44 L24 31 L32 44" />
      </svg>
    </div>
  );
}
