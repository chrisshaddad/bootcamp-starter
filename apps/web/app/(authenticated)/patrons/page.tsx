'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { usePendingPatrons } from '@/hooks/use-patrons';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, CheckCircle, XCircle, ShieldX } from 'lucide-react';
import { ApiError } from '@/lib/api';
import type { LibraryMemberWithOrganizationResponse } from '@repo/contracts';

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="h-16 w-16 text-error/70 mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
      <p className="text-muted-foreground text-center max-w-md">
        You don&apos;t have permission to access this page. Only Super Admins
        can review patron requests.
      </p>
    </div>
  );
}

export default function PatronsPage() {
  const { user, isLoading: userLoading } = useUser();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { patrons, total, isLoading, error, approve, reject } =
    usePendingPatrons({ enabled: isSuperAdmin });

  const [target, setTarget] = useState<{
    patron: LibraryMemberWithOrganizationResponse;
    action: 'approve' | 'reject';
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!target) return;
    setIsSubmitting(true);
    try {
      if (target.action === 'approve') {
        await approve(target.patron.id);
        toast.success('Patron approved');
      } else {
        await reject(target.patron.id);
        toast.success('Patron rejected');
      }
      setTarget(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!isSuperAdmin) {
    return <ForbiddenPage />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pending Patrons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review membership requests across every library on the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Requests
            {total !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load pending patrons
            </div>
          ) : !patrons?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No pending requests
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patron</TableHead>
                  <TableHead>Library</TableHead>
                  <TableHead>Card #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patrons.map((patron) => (
                  <TableRow key={patron.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {patron.user?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {patron.user?.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patron.organization.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patron.libraryCardNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patron.membershipType}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(patron.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-error border-error/30 hover:bg-error-light"
                          onClick={() =>
                            setTarget({ patron, action: 'reject' })
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-success text-white hover:bg-success-dark"
                          onClick={() =>
                            setTarget({ patron, action: 'approve' })
                          }
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.action === 'approve' ? 'Approve' : 'Reject'} Patron
            </DialogTitle>
            <DialogDescription>
              {target?.action === 'approve' ? (
                <>
                  Approve <strong>{target.patron.user?.name}</strong>&apos;s
                  request to join{' '}
                  <strong>{target.patron.organization.name}</strong>?
                </>
              ) : (
                <>
                  Reject <strong>{target?.patron.user?.name}</strong>&apos;s
                  request to join{' '}
                  <strong>{target?.patron.organization.name}</strong>?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={target?.action === 'reject' ? 'destructive' : 'default'}
              className={
                target?.action === 'approve'
                  ? 'bg-success text-white hover:bg-success-dark'
                  : undefined
              }
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : target?.action === 'approve'
                  ? 'Approve'
                  : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
