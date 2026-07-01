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
} from 'lucide-react';
import { format } from 'date-fns';
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
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {/* Expand chevron */}
        <TableCell className="w-8 pr-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </TableCell>

        {/* Name + visit count */}
        <TableCell>
          <p className="font-semibold text-gray-900">{group.name}</p>
          <p className="text-xs text-gray-400">
            {group.history.length} visit
            {group.history.length !== 1 ? 's' : ''} total
          </p>
        </TableCell>

        {/* Email */}
        <TableCell className="text-gray-600">{group.email}</TableCell>

        {/* Status badge */}
        <TableCell>
          {isCurrentlyIn ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Currently In
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
              Last visit:{' '}
              {group.history[0]
                ? format(new Date(group.history[0].checkedInAt), 'MMM d')
                : '—'}
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
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
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
            <span className="text-xs text-gray-300">—</span>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded history rows */}
      {expanded &&
        group.history.map((checkIn) => (
          <TableRow
            key={checkIn.id}
            className="bg-gray-50 border-l-2 border-primary-base"
          >
            {/* Indent spacer */}
            <TableCell />
            <TableCell className="pl-6">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                Session
              </span>
            </TableCell>
            <TableCell className="text-xs text-gray-600">
              <span className="font-medium">In:</span>{' '}
              {format(new Date(checkIn.checkedInAt), 'p — MMM d, yyyy')}
            </TableCell>
            <TableCell className="text-xs text-gray-600">
              {checkIn.checkedOutAt ? (
                <>
                  <span className="font-medium">Out:</span>{' '}
                  {format(new Date(checkIn.checkedOutAt), 'p — MMM d, yyyy')}
                </>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Check-ins &amp; Occupancy
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor live gym occupancy and check in members manually.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Live occupancy counter */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Users className="h-5 w-5 text-primary-base" />
              Live Occupancy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">
                {activeOccupancy}
              </span>
              <span className="text-sm font-medium text-gray-500">
                members currently in the gym
              </span>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Updated automatically upon check-in or check-out.
            </p>
          </CardContent>
        </Card>

        {/* Check-in search */}
        <Card className="border-gray-200 relative overflow-visible">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <UserCheck className="h-5 w-5 text-primary-base" />
              Check In Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search active members by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 border-gray-300 focus:ring-primary-base focus:border-primary-base"
              />
            </div>

            {searchQuery.trim() && (
              <div className="absolute left-6 right-6 z-10 mt-1 rounded-md border border-gray-200 bg-white shadow-lg">
                {filteredMembers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">
                    No active members found matching &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                    {filteredMembers.map((member) => (
                      <li key={member.id}>
                        <button
                          type="button"
                          onClick={() => handleCheckIn(member.id)}
                          disabled={isCheckingIn !== null}
                          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500">
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
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-gray-600" />
            Member Check-in History
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Click a member to expand their full visit history.
          </p>
        </CardHeader>
        <CardContent>
          {checkInsError ? (
            <div className="py-10 text-center text-error">
              Failed to load check-in data.
            </div>
          ) : memberGroups.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No check-in records yet.
            </div>
          ) : (
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
                {memberGroups.map((group) => (
                  <MemberRow
                    key={group.memberId}
                    group={group}
                    isCheckingOut={isCheckingOut}
                    onCheckOut={handleCheckOut}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
