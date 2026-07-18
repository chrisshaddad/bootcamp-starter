'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { UsersRound, Users, Building2, Bell, HeartPulse } from 'lucide-react';
import type { Role } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useMyInstitution } from '@/hooks/use-my-institution';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const QUICK_LINKS: Partial<Record<Role, QuickLink[]>> = {
  INSTITUTION_ADMIN: [
    {
      title: 'Patients',
      description: 'Register and manage patients',
      href: '/patients',
      icon: UsersRound,
    },
    {
      title: 'Staff & Doctors',
      description: 'Manage your team',
      href: '/users',
      icon: Users,
    },
    {
      title: 'My Institution',
      description: 'Edit institution profile',
      href: '/institution',
      icon: Building2,
    },
  ],
  STAFF: [
    {
      title: 'Patients',
      description: 'Register patients and manage care teams',
      href: '/patients',
      icon: UsersRound,
    },
    {
      title: 'Notifications',
      description: 'View your notifications',
      href: '/notifications',
      icon: Bell,
    },
  ],
  PROFESSIONAL: [
    {
      title: 'My Patients',
      description: 'Patients assigned to your care',
      href: '/patients',
      icon: UsersRound,
    },
    {
      title: 'Notifications',
      description: 'View your notifications',
      href: '/notifications',
      icon: Bell,
    },
  ],
  PATIENT: [
    {
      title: 'My Health',
      description: 'View your records and care team',
      href: '/portal',
      icon: HeartPulse,
    },
  ],
};

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

export default function DashboardPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const role = user?.role;
  const links = role ? (QUICK_LINKS[role] ?? []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {user?.fullName || user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what you can do today.
        </p>
      </div>

      {role === 'INSTITUTION_ADMIN' && <AdminInstitutionCard />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full border-border bg-card shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-100/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <link.icon className="h-5 w-5 text-primary-base" />
                  {link.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
