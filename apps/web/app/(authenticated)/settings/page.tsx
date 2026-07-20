'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, User, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { ThemePicker } from '@/components/theme-picker';
import { ThemeToggle } from '@/components/theme-toggle';

/** Read-only profile field — the org admin's account is managed by the platform, not self-editable */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}

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
            <User className="h-5 w-5 text-muted-foreground" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow icon={User} label="Name" value={user?.name ?? '—'} />
          <InfoRow icon={Mail} label="Email" value={user?.email ?? '—'} />
          <InfoRow
            icon={Phone}
            label="Phone"
            value={
              user?.phoneNumber ?? (
                <span className="text-muted-foreground">Not provided</span>
              )
            }
          />
          <InfoRow
            icon={ShieldCheck}
            label="Role"
            value={user?.role === 'ORG_ADMIN' ? 'Gym Admin' : user?.role}
          />
        </CardContent>
      </Card>
    </div>
  );
}
