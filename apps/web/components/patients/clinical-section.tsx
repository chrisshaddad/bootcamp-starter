'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import {
  bloodTypeSchema,
  type PatientClinicalUpdateRequest,
  type PatientDetailResponse,
  type BloodType,
} from '@repo/contracts';
import { ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BLOOD_TYPE_LABELS: Record<BloodType, string> = {
  A_POS: 'A+',
  A_NEG: 'A-',
  B_POS: 'B+',
  B_NEG: 'B-',
  AB_POS: 'AB+',
  AB_NEG: 'AB-',
  O_POS: 'O+',
  O_NEG: 'O-',
};

// The wire contract stores allergies/chronicConditions as string arrays, but
// they're edited here as a single comma-separated field — this schema
// validates the form's own (string) shape; parseList() converts to arrays
// for the PatientClinicalUpdateRequest sent to onSave.
const clinicalFormSchema = z.object({
  bloodType: z.union([bloodTypeSchema, z.literal('')]),
  allergies: z.string(),
  chronicConditions: z.string(),
  clinicalNotes: z.string(),
});
type ClinicalFormValues = z.infer<typeof clinicalFormSchema>;

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

interface Props {
  patient: PatientDetailResponse;
  canEdit: boolean;
  onSave: (data: PatientClinicalUpdateRequest) => Promise<unknown>;
}

export function ClinicalSection({ patient, canEdit, onSave }: Props) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ClinicalFormValues>({
    resolver: zodResolver(clinicalFormSchema),
  });

  const openDialog = () => {
    reset({
      bloodType: patient.bloodType ?? '',
      allergies: patient.allergies.join(', '),
      chronicConditions: patient.chronicConditions.join(', '),
      clinicalNotes: patient.clinicalNotes ?? '',
    });
    setOpen(true);
  };

  const parseList = (value: string): string[] =>
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const onSubmit = async (values: ClinicalFormValues) => {
    try {
      await onSave({
        bloodType: values.bloodType ? (values.bloodType as BloodType) : null,
        allergies: parseList(values.allergies),
        chronicConditions: parseList(values.chronicConditions),
        clinicalNotes: values.clinicalNotes || null,
      });
      toast.success('Clinical summary updated');
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to update',
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Clinical Summary</CardTitle>
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
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Blood Type</div>
          <div className="mt-0.5 text-sm font-medium text-foreground">
            {patient.bloodType ? (
              BLOOD_TYPE_LABELS[patient.bloodType]
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Allergies</div>
          <div className="mt-1">
            <Chips items={patient.allergies} />
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">
            Chronic Conditions
          </div>
          <div className="mt-1">
            <Chips items={patient.chronicConditions} />
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Clinical Notes</div>
          <div className="mt-0.5 whitespace-pre-wrap text-sm font-medium text-foreground">
            {patient.clinicalNotes || (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Clinical Summary</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clin-bloodType">Blood Type</Label>
              <select
                id="clin-bloodType"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                {...register('bloodType')}
              >
                <option value="">—</option>
                {Object.entries(BLOOD_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clin-allergies">
                Allergies (comma-separated)
              </Label>
              <Input
                id="clin-allergies"
                {...register('allergies')}
                placeholder="Penicillin, Peanuts"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clin-conditions">
                Chronic Conditions (comma-separated)
              </Label>
              <Input
                id="clin-conditions"
                {...register('chronicConditions')}
                placeholder="Diabetes, Hypertension"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clin-notes">Clinical Notes</Label>
              <Textarea id="clin-notes" {...register('clinicalNotes')} />
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
