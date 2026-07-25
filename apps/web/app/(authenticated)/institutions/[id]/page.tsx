'use client';

import { useUser } from '@/hooks/use-auth';
import { useInstitution } from '@/hooks/use-institutions';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  institutionAdminEmailUpdateRequestSchema,
  institutionAdminCreateRequestSchema,
  type InstitutionAdminEmailUpdateRequest,
  type InstitutionAdminCreateRequest,
  type InstitutionAdmin,
} from '@repo/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Pencil,
  Plus,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { ForbiddenPage } from '@/components/forbidden-page';
import { ApiError } from '@/lib/api';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function EditAdminEmailDialog({
  admin,
  open,
  onOpenChange,
  onSave,
}: {
  admin: InstitutionAdmin;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (adminId: string, email: string) => Promise<unknown>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InstitutionAdminEmailUpdateRequest>({
    resolver: zodResolver(institutionAdminEmailUpdateRequestSchema),
    // `values` (not `defaultValues`) so the form rehydrates when a different
    // admin's dialog is opened.
    values: { email: admin.email },
  });

  const onSubmit = async (data: InstitutionAdminEmailUpdateRequest) => {
    setIsSubmitting(true);
    try {
      await onSave(admin.id, data.email);
      toast.success('Email updated — a new invitation was sent');
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update email',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Admin Email</DialogTitle>
          <DialogDescription>
            Fixes a typo from institution set-up for{' '}
            <strong>{admin.fullName}</strong>. The account will be reset to
            pending and a fresh invitation sent to the corrected address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-error">{errors.email.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddAdminDialog({
  onAdd,
}: {
  onAdd: (data: InstitutionAdminCreateRequest) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InstitutionAdminCreateRequest>({
    resolver: zodResolver(institutionAdminCreateRequestSchema),
  });

  const onSubmit = async (data: InstitutionAdminCreateRequest) => {
    setIsSubmitting(true);
    try {
      await onAdd(data);
      toast.success('Admin added — an invitation was sent');
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to add admin',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Admin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Institution Admin</DialogTitle>
          <DialogDescription>
            Adds another admin to this institution and emails them an invitation
            to log in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-admin-fullName">Full Name</Label>
            <Input id="new-admin-fullName" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-error">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-admin-email">Email</Label>
            <Input id="new-admin-email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-error">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-admin-phone">Phone</Label>
            <Input id="new-admin-phone" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-error">{errors.phone.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}

export default function InstitutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<InstitutionAdmin | null>(
    null,
  );

  const institutionId = params.id as string;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const {
    institution,
    isLoading: institutionLoading,
    error,
    approve,
    reject,
    suspend,
    reactivate,
    updateAdminEmail,
    addAdmin,
  } = useInstitution(institutionId, { enabled: isSuperAdmin });

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approve();
      toast.success('Institution approved successfully');
      setShowApproveDialog(false);
    } catch (err) {
      toast.error('Failed to approve institution');
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await reject();
      toast.success('Institution rejected');
      setShowRejectDialog(false);
    } catch (err) {
      toast.error('Failed to reject institution');
      console.error(err);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSuspend = async () => {
    setIsSuspending(true);
    try {
      await suspend();
      toast.success('Institution suspended');
      setShowSuspendDialog(false);
    } catch (err) {
      toast.error('Failed to suspend institution');
      console.error(err);
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await reactivate();
      toast.success('Institution reactivated');
      setShowReactivateDialog(false);
    } catch (err) {
      toast.error('Failed to reactivate institution');
      console.error(err);
    } finally {
      setIsReactivating(false);
    }
  };

  if (userLoading || institutionLoading) {
    return <LoadingSkeleton />;
  }

  // Show 403 for non-super admins
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <ForbiddenPage message="You don't have permission to access this page. Only Super Admins can manage institutions." />
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <div className="text-error mb-4">Failed to load institution</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="py-10 text-center">
        <div className="text-muted-foreground mb-4">Institution not found</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isPending = institution.status === 'PENDING';
  const isActive = institution.status === 'ACTIVE';
  const isSuspendedOrRejected =
    institution.status === 'SUSPENDED' ||
    institution.status === 'REJECTED' ||
    institution.status === 'INACTIVE';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/institutions')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Institutions
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {institution.name}
          </h1>
          <div className="mt-2">
            <StatusBadge status={institution.status} />
          </div>
        </div>

        {/* Action Buttons — vary by current status */}
        {isPending && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 text-error border-error-light hover:bg-error-light"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              className="gap-2 bg-success hover:bg-success-dark"
              onClick={() => setShowApproveDialog(true)}
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          </div>
        )}
        {isActive && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="gap-2 text-error border-error-light hover:bg-error-light"
              onClick={() => setShowSuspendDialog(true)}
            >
              <Ban className="h-4 w-4" />
              Suspend
            </Button>
          </div>
        )}
        {isSuspendedOrRejected && (
          <div className="flex gap-3">
            <Button
              className="gap-2 bg-success hover:bg-success-dark"
              onClick={() => setShowReactivateDialog(true)}
            >
              <CheckCircle className="h-4 w-4" />
              Reactivate
            </Button>
          </div>
        )}
      </div>

      {/* Institution Info */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="admins">
            Admins
            {institution.admins !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({institution.admins.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                Institution Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <InfoRow icon={Building2} label="Type" value={institution.type} />
              <InfoRow
                icon={MapPin}
                label="Address"
                value={
                  institution.address || (
                    <span className="text-muted-foreground">Not provided</span>
                  )
                }
              />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={
                  institution.phone || (
                    <span className="text-muted-foreground">Not provided</span>
                  )
                }
              />
              <InfoRow
                icon={Calendar}
                label="Registered"
                value={new Date(institution.createdAt).toLocaleDateString(
                  'en-US',
                  {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  },
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Total Members
                  </div>
                  <div className="font-medium text-foreground">
                    {institution._count.users} user
                    {institution._count.users !== 1 ? 's' : ''}
                  </div>
                </div>

                {isPending && (
                  <div className="p-4 bg-warning-light rounded-lg border border-warning">
                    <div className="flex items-center gap-2 text-warning-dark">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Awaiting Approval</span>
                    </div>
                    <p className="mt-1 text-sm text-warning-dark">
                      This institution is waiting for a super admin to review
                      and approve the registration.
                    </p>
                  </div>
                )}

                {isSuspendedOrRejected && (
                  <div className="p-4 bg-error-light rounded-lg border border-error">
                    <div className="flex items-center gap-2 text-error-dark">
                      <Ban className="h-5 w-5" />
                      <span className="font-medium">Access blocked</span>
                    </div>
                    <p className="mt-1 text-sm text-error-dark">
                      No one at this institution can log in or use the platform
                      until it&apos;s reactivated.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Admins
              </CardTitle>
              <AddAdminDialog onAdd={addAdmin} />
            </CardHeader>
            <CardContent className="pt-0">
              {!institution.admins?.length ? (
                <p className="text-sm text-muted-foreground">
                  No admins found.
                </p>
              ) : (
                <div className="space-y-1">
                  {institution.admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {admin.fullName}
                        </div>
                        <div
                          className="text-sm text-muted-foreground truncate"
                          title={admin.email}
                        >
                          {admin.email}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge
                          status={
                            !admin.isActive
                              ? 'INACTIVE'
                              : admin.isConfirmed
                                ? 'ACTIVE'
                                : 'PENDING'
                          }
                          label={
                            !admin.isActive
                              ? 'Deactivated'
                              : admin.isConfirmed
                                ? 'Confirmed'
                                : 'Pending'
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingAdmin(admin)}
                          aria-label={`Edit email for ${admin.fullName}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingAdmin && (
        <EditAdminEmailDialog
          admin={editingAdmin}
          open={!!editingAdmin}
          onOpenChange={(open) => {
            if (!open) setEditingAdmin(null);
          }}
          onSave={updateAdminEmail}
        />
      )}

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Institution</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve{' '}
              <strong>{institution.name}</strong>? This will allow the
              institution admin to start inviting members and using the
              platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              className="bg-success hover:bg-success-dark"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Institution</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject{' '}
              <strong>{institution.name}</strong>? The institution admin will
              not be able to use the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting}
            >
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Institution</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend{' '}
              <strong>{institution.name}</strong>? Every user at this
              institution will immediately be blocked from logging in or using
              the platform, until it&apos;s reactivated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
              disabled={isSuspending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={isSuspending}
            >
              {isSuspending ? 'Suspending...' : 'Suspend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Confirmation Dialog */}
      <Dialog
        open={showReactivateDialog}
        onOpenChange={setShowReactivateDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Institution</DialogTitle>
            <DialogDescription>
              Are you sure you want to reactivate{' '}
              <strong>{institution.name}</strong>? Its users will immediately
              regain the ability to log in and use the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReactivateDialog(false)}
              disabled={isReactivating}
            >
              Cancel
            </Button>
            <Button
              className="bg-success hover:bg-success-dark"
              onClick={handleReactivate}
              disabled={isReactivating}
            >
              {isReactivating ? 'Reactivating...' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
