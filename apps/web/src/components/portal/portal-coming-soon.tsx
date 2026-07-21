import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Placeholder surface for portal sections whose content lands in TP3
 * (available units, support, profile). Server-safe, fully localized by the
 * caller. Keeps the warm portal tone rather than a bare "404-ish" page.
 */
export function PortalComingSoon({
  icon,
  badge,
  title,
  description,
}: {
  icon: ReactNode;
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="ring-amber-200/50 dark:ring-amber-900/30">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
          {icon}
        </span>
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-400/10 dark:text-amber-300"
        >
          {badge}
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
