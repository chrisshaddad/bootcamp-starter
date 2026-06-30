'use client';

import { User, Mail, Phone, CalendarDays } from 'lucide-react';
import { useMeProfile } from '@/hooks/use-me';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-primary-100 text-primary-base border border-primary-200',
  INACTIVE: 'bg-gray-200 text-gray-700 border border-gray-300',
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
    <div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}


export default function MyProfilePage() {
  const { profile, isLoading, error } = useMeProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your membership details on file with the gym.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-error/20 bg-error-light px-4 py-3 text-sm text-error">
          Failed to load profile. Please refresh.
        </div>
      )}

      {!isLoading && !error && profile && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
              <User className="h-7 w-7 text-primary-base" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profile.name}
              </h2>
              <span
                className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[profile.status] ?? 'bg-gray-200 text-gray-700'}`}
              >
                {profile.status === 'ACTIVE' ? 'Active Member' : 'Inactive'}
              </span>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-gray-500" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <InfoRow icon={Mail} label="Email" value={profile.email} />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={
                  profile.phoneNumber ?? (
                    <span className="text-gray-400">Not provided</span>
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
                    <span className="text-gray-400">Not provided</span>
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
