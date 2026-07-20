'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Users,
  Search,
  UserCheck,
  LogOut,
  Loader2,
  Fingerprint,
  ChevronDown,
  ChevronRight,
  Clock,
  QrCode,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  useCheckIns,
  useCheckInMember,
  useCheckOutMember,
} from '@/hooks/use-checkins';
import { useMembers } from '@/hooks/use-members';
import { ApiError } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { CheckInResponse } from '@repo/contracts';

/** Shape of a member group built from the flat check-in list */
interface MemberGroup {
  memberId: string;
  name: string;
  email: string;
  activeCheckIn: CheckInResponse | null;
  history: CheckInResponse[];
}

/** Loading skeleton shown while data is fetching */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Single member row with inline expand/collapse for check-in history */
function MemberRow({
  group,
  isCheckingOut,
  onCheckOut,
}: {
  group: MemberGroup;
  isCheckingOut: string | null;
  onCheckOut: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCurrentlyIn = group.activeCheckIn !== null;

  return (
    <>
      {/* Summary row — one per member */}
      <TableRow
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {/* Expand chevron */}
        <TableCell className="w-8 pr-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>

        {/* Name + visit count */}
        <TableCell>
          <p className="font-semibold text-foreground">{group.name}</p>
          <p className="text-xs text-muted-foreground">
            {group.history.length} visit
            {group.history.length !== 1 ? 's' : ''} total
          </p>
        </TableCell>

        {/* Email */}
        <TableCell className="text-muted-foreground">{group.email}</TableCell>

        {/* Status badge */}
        <TableCell>
          {isCurrentlyIn ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Currently In
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Last visit:{' '}
              {group.history[0]
                ? format(new Date(group.history[0].checkedInAt), 'MMM d')
                : 'N/A'}
            </span>
          )}
        </TableCell>

        {/* Check-out action — only for currently-in members */}
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          {isCurrentlyIn && group.activeCheckIn ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isCheckingOut !== null}
              onClick={() => onCheckOut(group.activeCheckIn!.id)}
              className="border-error/30 text-error hover:bg-error-light hover:text-error"
            >
              {isCheckingOut === group.activeCheckIn.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Check Out
                </>
              )}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground/50">-</span>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded history rows */}
      {expanded &&
        group.history.map((checkIn) => (
          <TableRow
            key={checkIn.id}
            className="bg-muted border-l-2 border-primary-base"
          >
            {/* Indent spacer */}
            <TableCell />
            <TableCell className="pl-6">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Session
              </span>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              <span className="font-medium">In:</span>{' '}
              {format(new Date(checkIn.checkedInAt), 'MMM d, yyyy, p')}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {checkIn.checkedOutAt ? (
                <>
                  <span className="font-medium">Out:</span>{' '}
                  {format(new Date(checkIn.checkedOutAt), 'MMM d, yyyy, p')}
                </>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                  Still in
                </span>
              )}
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
    </>
  );
}

/** Check-ins & Occupancy page for gym managers */
export default function CheckInsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in' | 'out'>('all');

  const {
    checkIns,
    isLoading: isLoadingCheckIns,
    error: checkInsError,
  } = useCheckIns();

  const { members, isLoading: isLoadingMembers } = useMembers({
    status: 'ACTIVE',
  });

  const { checkInMember } = useCheckInMember();
  const { checkOutMember } = useCheckOutMember();

  /** Active members currently in the gym (no checkout yet) */
  const activeOccupancy = useMemo(
    () => checkIns?.checkIns.filter((c) => c.checkedOutAt === null).length ?? 0,
    [checkIns],
  );

  /**
   * Group all flat check-in records by memberId so each member
   * appears exactly once in the summary table.
   */
  const memberGroups = useMemo<MemberGroup[]>(() => {
    if (!checkIns?.checkIns.length) return [];

    const map = new Map<string, MemberGroup>();

    for (const checkIn of checkIns.checkIns) {
      const memberId = checkIn.memberId;
      if (!map.has(memberId)) {
        map.set(memberId, {
          memberId,
          name: checkIn.member?.name ?? 'Unknown Member',
          email: checkIn.member?.email ?? '',
          activeCheckIn: null,
          history: [],
        });
      }
      const group = map.get(memberId)!;
      group.history.push(checkIn);
      if (!checkIn.checkedOutAt) {
        group.activeCheckIn = checkIn;
      }
    }

    // Sort: currently-in members first, then by most recent visit
    return Array.from(map.values()).sort((a, b) => {
      if (a.activeCheckIn && !b.activeCheckIn) return -1;
      if (!a.activeCheckIn && b.activeCheckIn) return 1;
      const aLatest = new Date(a.history[0]?.checkedInAt ?? 0).getTime();
      const bLatest = new Date(b.history[0]?.checkedInAt ?? 0).getTime();
      return bLatest - aLatest;
    });
  }, [checkIns]);

  const visibleGroups = useMemo(() => {
    if (statusFilter === 'in')
      return memberGroups.filter((g) => g.activeCheckIn !== null);
    if (statusFilter === 'out')
      return memberGroups.filter((g) => g.activeCheckIn === null);
    return memberGroups;
  }, [memberGroups, statusFilter]);

  /** Members eligible for check-in (active, not currently in gym) */
  const filteredMembers = useMemo(() => {
    if (!members) return [];

    const activelyCheckedInIds = new Set(
      checkIns?.checkIns
        .filter((c) => c.checkedOutAt === null)
        .map((c) => c.memberId) || [],
    );

    const query = searchQuery.trim().toLowerCase();

    return members
      .filter((m) => !activelyCheckedInIds.has(m.id))
      .filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [members, checkIns, searchQuery]);

  /** Handle check-in button click from the search dropdown */
  const handleCheckIn = async (memberId: string) => {
    setIsCheckingIn(memberId);
    try {
      await checkInMember({ memberId });
      toast.success('Member checked in successfully');
      setSearchQuery('');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to check in member',
      );
    } finally {
      setIsCheckingIn(null);
    }
  };

  /** Handle check-out button click in the member row */
  const handleCheckOut = async (checkInId: string) => {
    setIsCheckingOut(checkInId);
    try {
      await checkOutMember(checkInId);
      toast.success('Member checked out successfully');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to check out member',
      );
    } finally {
      setIsCheckingOut(null);
    }
  };

  if (isLoadingCheckIns || isLoadingMembers) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Check-ins &amp; Occupancy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor live gym occupancy and check in members manually.
          </p>
        </div>
        <Link href="/checkins/qr">
          <Button className="bg-primary-base hover:bg-primary-base/90 text-white flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Open QR Kiosk
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Live occupancy counter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-primary-base" />
              Live Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-foreground">
                {activeOccupancy}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                members currently in the gym
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Updated automatically upon check-in or check-out.
            </p>
          </CardContent>
        </Card>

        {/* Check-in search */}
        <Card className="relative overflow-visible">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserCheck className="h-5 w-5 text-primary-base" />
              Check In Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Search active members by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4"
              />
            </div>

            {searchQuery.trim() && (
              <div className="absolute left-6 right-6 z-10 mt-1 rounded-md border border-border bg-popover shadow-lg">
                {filteredMembers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No active members found matching &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <ul className="divide-y divide-border max-h-60 overflow-y-auto">
                    {filteredMembers.map((member) => (
                      <li key={member.id}>
                        <button
                          type="button"
                          onClick={() => handleCheckIn(member.id)}
                          disabled={isCheckingIn !== null}
                          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {member.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                          {isCheckingIn === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary-base" />
                          ) : (
                            <span className="text-xs font-semibold text-primary-base hover:underline">
                              Check In
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member list — one row per member, expandable history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-muted-foreground" />
            Member Check-in History
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Click a member to expand their full visit history.
          </p>
        </CardHeader>
        <CardContent>
          {checkInsError ? (
            <div className="py-10 text-center text-error">
              Failed to load check-in data.
            </div>
          ) : memberGroups.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No check-in records yet.
            </div>
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                {(
                  [
                    { key: 'all', label: `All (${memberGroups.length})` },
                    {
                      key: 'in',
                      label: `Currently In (${memberGroups.filter((g) => g.activeCheckIn).length})`,
                    },
                    {
                      key: 'out',
                      label: `Checked Out (${memberGroups.filter((g) => !g.activeCheckIn).length})`,
                    },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      statusFilter === key
                        ? 'bg-primary-base text-white border-primary-base'
                        : 'border-border text-muted-foreground hover:border-primary-base hover:text-primary-base'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    {/* chevron column */}
                    <TableHead className="w-8" />
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleGroups.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-muted-foreground"
                      >
                        {statusFilter === 'in'
                          ? 'No members are currently in the gym.'
                          : 'No checked-out members to show.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleGroups.map((group) => (
                      <MemberRow
                        key={group.memberId}
                        group={group}
                        isCheckingOut={isCheckingOut}
                        onCheckOut={handleCheckOut}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
