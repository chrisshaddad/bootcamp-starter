'use client';

import type { MeResponse } from '@/types/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DefaultDashboardProps {
  me: MeResponse | null;
  locale: string;
  role: string;
}

export function DefaultDashboard({ me, role }: DefaultDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            {me?.org?.name ?? 'Your Organization'}
          </CardTitle>
          <CardDescription>
            You are signed in to your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role</span>
            <Badge variant="secondary" className="capitalize">
              {role.replace(/_/g, ' ').toLowerCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
