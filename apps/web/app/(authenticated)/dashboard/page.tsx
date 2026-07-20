'use client';

import {
  UsersRound,
  Users,
  Stethoscope,
  UserRoundX,
  Building2,
  CalendarClock,
  Syringe,
} from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { RecordTypeCount } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useMyInstitution } from '@/hooks/use-my-institution';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { StatTile } from '@/components/stat-tile';
import { SimpleBarChart } from '@/components/charts/simple-bar-chart';
import { TrendLineChart } from '@/components/charts/trend-line-chart';

const RECORD_TYPE_LABELS: Record<RecordTypeCount['recordType'], string> = {
  LAB_RESULT: 'Lab Result',
  CONSULTATION: 'Consultation',
  PRESCRIPTION: 'Prescription',
  SCAN: 'Scan',
  VACCINATION: 'Vaccination',
};

function toBarData(counts: RecordTypeCount[]) {
  return counts.map((c) => ({
    label: RECORD_TYPE_LABELS[c.recordType],
    value: c.count,
  }));
}

function toTrendData(daily: { date: string; count: number }[]) {
  return daily.map((d) => ({ date: d.date, value: d.count }));
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function isOverdue(value: string | Date): boolean {
  return new Date(value).getTime() < new Date().setHours(0, 0, 0, 0);
}

function AdminInstitutionCard() {
  const { institution, isLoading } = useMyInstitution();

  if (isLoading) return <Skeleton className="h-28 rounded-xl" />;
  if (!institution) return null;

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          {institution.name}
          <StatusBadge status={institution.status} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {institution.type} · {institution._count.users} member
          {institution._count.users === 1 ? '' : 's'}
        </p>
      </CardContent>
    </Card>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

function InstitutionAdminDashboard() {
  const { stats, isLoading } = useDashboardStats();

  if (isLoading || !stats || stats.role !== 'INSTITUTION_ADMIN') {
    return <StatsGridSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total patients"
          value={stats.totalPatients}
          icon={UsersRound}
        />
        <StatTile
          label="Active staff"
          value={stats.activeStaffCount}
          icon={Users}
        />
        <StatTile
          label="Active professionals"
          value={stats.activeProfessionalCount}
          icon={Stethoscope}
        />
        <StatTile
          label="Patients with no care team"
          value={stats.unassignedPatientsCount}
          icon={UserRoundX}
          href="/patients?unassigned=true"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Records added this week</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              title="Records added this week, by type"
              data={toBarData(stats.recordsByTypeThisWeek)}
            />
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              New patients (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart
              title="New patient registrations, last 30 days"
              data={toTrendData(stats.newPatientsLast30Days)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StaffDashboard() {
  const { stats, isLoading } = useDashboardStats();

  if (isLoading || !stats || stats.role !== 'STAFF') {
    return <StatsGridSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Patients with no care team"
          value={stats.unassignedPatientsCount}
          icon={UserRoundX}
          href="/patients?unassigned=true"
        />
        <StatTile
          label="Registered by you this week"
          value={stats.patientsRegisteredByMeThisWeek}
          icon={UsersRound}
        />
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent registrations</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentRegistrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t registered any patients yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentRegistrations.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-foreground">{p.fullName}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(p.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfessionalDashboard() {
  const { stats, isLoading } = useDashboardStats();

  if (isLoading || !stats || stats.role !== 'PROFESSIONAL') {
    return <StatsGridSkeleton />;
  }

  const totalRecordsThisWeek = stats.recordsByTypeThisWeek.reduce(
    (sum, r) => sum + r.count,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Active assigned patients"
          value={stats.activeAssignedPatientsCount}
          icon={UsersRound}
        />
        <StatTile
          label="Records added this week"
          value={totalRecordsThisWeek}
          icon={Stethoscope}
        />
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            Records this week, by type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleBarChart
            title="Records added this week, by type"
            data={toBarData(stats.recordsByTypeThisWeek)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Follow-ups due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.followUpsDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No follow-ups due in the next two weeks.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.followUpsDue.map((f) => (
                  <li
                    key={f.recordId}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-foreground">
                      {f.patientName}
                    </span>
                    <span
                      className={
                        isOverdue(f.followUpDate)
                          ? 'text-sm font-medium text-error'
                          : 'text-sm text-muted-foreground'
                      }
                    >
                      {formatDate(f.followUpDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Syringe className="h-4 w-4" />
              Vaccinations due
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.vaccinationsDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No vaccine doses due in the next two weeks.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.vaccinationsDue.map((v) => (
                  <li
                    key={v.recordId}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-foreground">
                      {v.patientName} · {v.vaccineName}
                    </span>
                    <span
                      className={
                        isOverdue(v.nextDoseDate)
                          ? 'text-sm font-medium text-error'
                          : 'text-sm text-muted-foreground'
                      }
                    >
                      {formatDate(v.nextDoseDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const role = user?.role;

  // Patients have no use for this dashboard — their home is My Health.
  useEffect(() => {
    if (role === 'PATIENT') {
      router.replace('/my-health');
    }
  }, [role, router]);

  if (isLoading || role === 'PATIENT') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {user?.fullName || user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {role === 'INSTITUTION_ADMIN' && (
        <>
          <AdminInstitutionCard />
          <InstitutionAdminDashboard />
        </>
      )}
      {role === 'STAFF' && <StaffDashboard />}
      {role === 'PROFESSIONAL' && <ProfessionalDashboard />}
    </div>
  );
}
