'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import {
  patientAdminUpdateRequestSchema,
  type PatientAdminUpdateRequest,
  type PatientDetailResponse,
} from '@repo/contracts';
import { ApiError } from '@/lib/api';
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

function toDateInput(value: string | Date | null): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value: string | Date | null): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">
        {value || <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}

interface Props {
  patient: PatientDetailResponse;
  canEdit: boolean;
  onSave: (data: PatientAdminUpdateRequest) => Promise<unknown>;
}

export function AdministrativeSection({ patient, canEdit, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm<PatientAdminUpdateRequest>({
    resolver: zodResolver(patientAdminUpdateRequestSchema),
  });

  const openDialog = () => {
    reset({
      fullName: patient.fullName,
      phone: patient.phone,
      dateOfBirth: toDateInput(patient.dateOfBirth) || undefined,
      gender: patient.gender ?? undefined,
      nationalId: patient.nationalId ?? undefined,
      address: patient.address ?? undefined,
      emergencyContactName: patient.emergencyContactName ?? undefined,
      emergencyContactPhone: patient.emergencyContactPhone ?? undefined,
      emergencyContactRelationship:
        patient.emergencyContactRelationship ?? undefined,
    });
    setOpen(true);
  };

  const onSubmit = async (data: PatientAdminUpdateRequest) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      toast.success('Administrative details updated');
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Administrative</CardTitle>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={openDialog}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={patient.fullName} />
          <Field label="Email" value={patient.email} />
          <Field label="Phone" value={patient.phone} />
          <Field
            label="Date of Birth"
            value={formatDate(patient.dateOfBirth)}
          />
          <Field label="Gender" value={patient.gender} />
          <Field label="National ID" value={patient.nationalId} />
          <Field label="Address" value={patient.address} />
          <Field
            label="Emergency Contact"
            value={
              patient.emergencyContactName
                ? `${patient.emergencyContactName}${
                    patient.emergencyContactPhone
                      ? ` · ${patient.emergencyContactPhone}`
                      : ''
                  }${
                    patient.emergencyContactRelationship
                      ? ` (${patient.emergencyContactRelationship})`
                      : ''
                  }`
                : null
            }
          />
        </dl>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Administrative Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-fullName">Full Name</Label>
                <Input id="admin-fullName" {...register('fullName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-phone">Phone</Label>
                <Input id="admin-phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-dob">Date of Birth</Label>
                <Input
                  id="admin-dob"
                  type="date"
                  {...register('dateOfBirth')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-gender">Gender</Label>
                <select
                  id="admin-gender"
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                  {...register('gender', {
                    // The blank option must become null, not '', or the enum
                    // (MALE | FEMALE | OTHER) validation rejects it.
                    setValueAs: (v) => (v === '' ? null : v),
                  })}
                >
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-nationalId">National ID</Label>
              <Input id="admin-nationalId" {...register('nationalId')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-address">Address</Label>
              <Input id="admin-address" {...register('address')} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-ecName">Emergency Name</Label>
                <Input
                  id="admin-ecName"
                  {...register('emergencyContactName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ecPhone">Emergency Phone</Label>
                <Input
                  id="admin-ecPhone"
                  {...register('emergencyContactPhone')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-ecRel">Relationship</Label>
                <Input
                  id="admin-ecRel"
                  {...register('emergencyContactRelationship')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
