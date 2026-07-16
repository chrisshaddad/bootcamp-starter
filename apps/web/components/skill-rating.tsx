'use client';

import { cn } from '@/lib/utils';

interface SkillRatingProps {
  level: number;
  onChange?: (level: number) => void;
  className?: string;
}

const LEVELS = [1, 2, 3, 4, 5];

/**
 * 5-dot proficiency indicator. Read-only unless `onChange` is provided, in
 * which case each dot becomes clickable to set that level.
 */
export function SkillRating({ level, onChange, className }: SkillRatingProps) {
  const interactive = !!onChange;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {LEVELS.map((dotLevel) => {
        const filled = dotLevel <= level;
        const dot = (
          <span
            className={cn(
              'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
              filled ? 'bg-primary-base' : 'border border-gray-300 bg-white',
            )}
          />
        );

        if (!interactive) {
          return <span key={dotLevel}>{dot}</span>;
        }

        return (
          <button
            key={dotLevel}
            type="button"
            aria-label={`Set proficiency to ${dotLevel}`}
            onClick={() => onChange(dotLevel)}
            className="inline-flex rounded-full p-0.5 transition-transform hover:scale-110"
          >
            {dot}
          </button>
        );
      })}
    </div>
  );
}
