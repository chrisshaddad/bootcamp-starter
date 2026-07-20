import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface StatTileProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  /** When set, the whole tile links here — use for stats that point at a specific, filtered view. */
  href?: string;
}

/** A single headline number — sentence-case label, no trailing colon. */
export function StatTile({ label, value, icon: Icon, href }: StatTileProps) {
  const card = (
    <Card
      className={cn(
        'border-border bg-card shadow-sm',
        href &&
          'transition-colors hover:border-primary-300 hover:bg-primary-100/30',
      )}
    >
      <CardContent className="flex items-center gap-4">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-300/20">
            <Icon className="h-5 w-5 text-primary-base dark:text-primary-300" />
          </div>
        )}
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block"
      aria-label={`${label}: ${value}. View filtered list.`}
    >
      {card}
    </Link>
  );
}
