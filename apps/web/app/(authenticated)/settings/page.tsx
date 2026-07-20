'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Palette } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { ThemePicker } from '@/components/theme-picker';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SettingsPage() {
  const { user } = useUser({ redirectOnUnauthenticated: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Palette className="h-5 w-5 text-muted-foreground" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-6">
            <div>
              <p className="text-sm font-medium text-foreground">Mode</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Switch between dark and light mode. Dark is the default.
              </p>
            </div>
            <ThemeToggle />
          </div>
          {user?.role === 'ORG_ADMIN' && <ThemePicker />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-75 flex-col items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              Coming Soon
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Settings features are being developed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
