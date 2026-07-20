'use client';

import { User, Mail, Phone, CalendarDays } from 'lucide-react';
import { useMeProfile } from '@/hooks/use-me';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success border border-success/20',
  INACTIVE: 'bg-muted text-muted-foreground border border-border',
};

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
    <div className="flex items-start gap-3.5 border-b border-border py-3.5 last:border-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-base" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-sm font-semibold text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const { profile, isLoading, error } = useMeProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your membership details on file with the gym.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm font-semibold text-error">
          Failed to load profile. Please refresh.
        </div>
      )}

      {!isLoading && !error && profile && (
        <>
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/60">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-base/10 dark:bg-primary-base/20 shadow-2xs">
              <User className="h-7 w-7 text-primary-base dark:text-primary-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {profile.name}
              </h2>
              <span
                className={`mt-1.5 inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_COLORS[profile.status] ?? 'bg-muted text-muted-foreground'}`}
              >
                {profile.status === 'ACTIVE' ? 'Active Member' : 'Inactive'}
              </span>
            </div>
          </div>

          <Card className="glass-card card-elevated rounded-xl border-border bg-card">
            <CardHeader className="border-b border-border/50 pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <User className="h-5 w-5 text-muted-foreground" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-4">
              <InfoRow icon={Mail} label="Email" value={profile.email} />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={
                  profile.phoneNumber ?? (
                    <span className="text-muted-foreground/60 italic">
                      Not provided
                    </span>
                  )
                }
              />
              <InfoRow
                icon={CalendarDays}
                label="Date of Birth"
                value={
                  profile.dateOfBirth ? (
                    new Date(profile.dateOfBirth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  ) : (
                    <span className="text-muted-foreground/60 italic">
                      Not provided
                    </span>
                  )
                }
              />
              <InfoRow
                icon={CalendarDays}
                label="Member Since"
                value={new Date(profile.joinedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
