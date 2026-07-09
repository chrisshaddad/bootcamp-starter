'use client';

import Link from 'next/link';
import { AnnouncementList } from '@/components/announcement-list';
import { useAnnouncements } from '@/hooks/use-announcements';
import { useUser } from '@/hooks/use-auth';
import { useStatsOverview } from '@/hooks/use-stats';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRate } from '@/lib/format';
import {
  Users,
  Calendar,
  ClipboardCheck,
  Megaphone,
  UsersRound,
  BarChart3,
  ShieldX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FeatureCard {
  title: string;
  description: string;
  icon: LucideIcon;
  status: 'active' | 'soon';
  href?: string;
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    title: 'Member Management',
    description:
      'Profiles, groups, and contact info for your organization members.',
    icon: Users,
    status: 'active',
    href: '/members',
  },
  {
    title: 'Activities & Events',
    description:
      'Create workshops, meetings, and camps. Assign members to events.',
    icon: Calendar,
    status: 'active',
    href: '/events',
  },
  {
    title: 'Attendance Tracking',
    description: 'Log attendance per event and view history per member.',
    icon: ClipboardCheck,
    status: 'active',
    href: '/reports',
  },
  {
    title: 'Announcements',
    description: 'Post updates targeted to specific groups or all members.',
    icon: Megaphone,
    status: 'active',
    href: '/announcements',
  },
  {
    title: 'Groups',
    description: 'Organize members into groups for targeted communication.',
    icon: UsersRound,
    status: 'soon',
  },
  {
    title: 'Dashboard Stats',
    description:
      'Key metrics: total members, upcoming events, attendance rates.',
    icon: BarChart3,
    status: 'active',
    href: '/reports',
  },
];

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You don&apos;t have permission to access this page. Only Super Admins
        can access the Coordly admin portal.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function FeatureCardItem({ card }: { card: FeatureCard }) {
  const Icon = card.icon;
  const isActive = card.status === 'active' && card.href;

  const content = (
    <Card
      className={`h-full border-gray-200 bg-white shadow-sm transition-colors ${
        isActive
          ? 'cursor-pointer hover:border-primary-base hover:shadow-md'
          : 'opacity-75'
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100">
              <Icon className="h-5 w-5 text-primary-base" />
            </div>
            <CardTitle className="text-base font-semibold text-gray-900">
              {card.title}
            </CardTitle>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              card.status === 'active'
                ? 'bg-primary-100 text-primary-base'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {card.status === 'active' ? 'Active' : 'Soon'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">{card.description}</p>
      </CardContent>
    </Card>
  );

  if (isActive && card.href) {
    return <Link href={card.href}>{content}</Link>;
  }

  return content;
}

export default function AdminPage() {
  const { user, isLoading: userLoading } = useUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { overview, isLoading: overviewLoading } = useStatsOverview({
    enabled: isSuperAdmin,
  });
  const {
    announcements,
    isLoading: announcementsLoading,
    error: announcementsError,
  } = useAnnouncements({
    enabled: isSuperAdmin,
    limit: 5,
  });

  if (userLoading) {
    return <LoadingSkeleton />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Coordly Admin</h1>
        <p className="mt-1 text-sm text-gray-500">
          Super admin portal for member management, events, and organization
          activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Members"
          value={overviewLoading ? '—' : (overview?.memberCount ?? 0)}
        />
        <StatCard
          title="Upcoming Events"
          value={overviewLoading ? '—' : (overview?.upcomingEvents ?? 0)}
          subtitle={
            overview ? `${overview.totalEvents} total events` : undefined
          }
        />
        <StatCard
          title="Attendance Rate"
          value={overviewLoading ? '—' : formatRate(overview?.attendanceRate)}
          subtitle="Across past events"
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Features</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map((card) => (
            <FeatureCardItem key={card.title} card={card} />
          ))}
        </div>
      </div>

      <AnnouncementList
        announcements={announcements}
        isLoading={announcementsLoading}
        error={announcementsError}
        compact
        showViewAll
      />
    </div>
  );
}
