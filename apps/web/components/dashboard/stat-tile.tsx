import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  caption?: string;
  /** Tailwind text color class for the value - defaults to plain foreground. */
  tone?: string;
}

/** A single KPI tile - the building block every dashboard variant is made of. */
export function StatTile({
  label,
  value,
  icon: Icon,
  caption,
  tone,
}: StatTileProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold text-foreground', tone)}>
          {value}
        </div>
        {caption && (
          <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
        )}
      </CardContent>
    </Card>
  );
}
