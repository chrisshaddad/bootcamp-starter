'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building2, Pencil } from 'lucide-react';
import {
  institutionUpdateRequestSchema,
  type InstitutionUpdateRequest,
} from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useMyInstitution } from '@/hooks/use-my-institution';
import { ApiError } from '@/lib/api';
import { ForbiddenPage } from '@/components/forbidden-page';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

export default function InstitutionPage() {
  const { user, isLoading: userLoading } = useUser();
  const isAdmin = user?.role === 'INSTITUTION_ADMIN';

  const { institution, isLoading, error, updateInstitution } = useMyInstitution(
    {
      enabled: isAdmin,
    },
  );

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm<InstitutionUpdateRequest>({
    resolver: zodResolver(institutionUpdateRequestSchema),
  });

  if (userLoading || (isAdmin && isLoading)) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!isAdmin) {
    return (
      <ForbiddenPage message="Only institution admins can manage the institution profile." />
    );
  }

  if (error || !institution) {
    return (
      <div className="py-10 text-center text-error">
        Failed to load institution
      </div>
    );
  }

  const openDialog = () => {
    reset({
      name: institution.name,
      type: institution.type,
      address: institution.address ?? undefined,
      phone: institution.phone ?? undefined,
      emailNotifications: institution.emailNotifications,
    });
    setOpen(true);
  };

  const onSubmit = async (data: InstitutionUpdateRequest) => {
    setIsSubmitting(true);
    try {
      await updateInstitution(data);
      toast.success('Institution updated');
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update institution',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Institution</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your institution profile
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            {institution.name}
            <StatusBadge status={institution.status} />
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={openDialog}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Type" value={institution.type} />
            <Field label="Members" value={`${institution._count.users}`} />
            <Field label="Address" value={institution.address} />
            <Field label="Phone" value={institution.phone} />
            <Field
              label="Email Notifications"
              value={institution.emailNotifications ? 'Enabled' : 'Disabled'}
            />
          </dl>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Institution</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inst-name">Name</Label>
              <Input id="inst-name" {...register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inst-type">Type</Label>
              <select
                id="inst-type"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                {...register('type')}
              >
                <option value="CLINIC">Clinic</option>
                <option value="HOSPITAL">Hospital</option>
                <option value="LAB">Lab</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inst-address">Address</Label>
              <Input id="inst-address" {...register('address')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inst-phone">Phone</Label>
              <Input id="inst-phone" {...register('phone')} />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" {...register('emailNotifications')} />
              Enable email notifications
            </label>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
