'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Check } from 'lucide-react';
import {
  genderSchema,
  bloodTypeSchema,
  type Gender,
  type BloodType,
  type PatientCreateRequest,
  type PatientClinicalUpdateRequest,
} from '@repo/contracts';
import {
  useCreatePatient,
  useUpdatePatientClinical,
} from '@/hooks/use-patients';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

// Form-level schema. Only the identity fields (step 1) are required; every
// other field is an optional string collected at creation time. allergies /
// chronicConditions are edited as comma-separated strings and split into arrays
// on submit (mirroring clinical-section.tsx); bloodType/gender use '' for "unset".
const createPatientFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.email('Enter a valid email'),
  phone: z.string().min(1, 'Phone is required'),
  dateOfBirth: z.string(),
  gender: z.union([genderSchema, z.literal('')]),
  nationalId: z.string(),
  address: z.string(),
  emergencyContactName: z.string(),
  emergencyContactPhone: z.string(),
  emergencyContactRelationship: z.string(),
  bloodType: z.union([bloodTypeSchema, z.literal('')]),
  allergies: z.string(),
  chronicConditions: z.string(),
  clinicalNotes: z.string(),
});
type CreatePatientFormValues = z.infer<typeof createPatientFormSchema>;

const DEFAULT_VALUES: CreatePatientFormValues = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  nationalId: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  bloodType: '',
  allergies: '',
  chronicConditions: '',
  clinicalNotes: '',
};

// Fields validated when advancing past each step (only step 1 has required rules).
const STEP_FIELDS: (keyof CreatePatientFormValues)[][] = [
  ['fullName', 'email', 'phone', 'dateOfBirth', 'gender', 'nationalId'],
  [
    'address',
    'emergencyContactName',
    'emergencyContactPhone',
    'emergencyContactRelationship',
  ],
  ['bloodType', 'allergies', 'chronicConditions', 'clinicalNotes'],
];

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                  isActive &&
                    'border-primary bg-primary text-primary-foreground',
                  isDone && 'border-primary bg-primary/10 text-primary',
                  !isActive && !isDone && 'border-border text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:inline',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  /** Institution Admins can also set clinical data at creation (Staff cannot). */
  canEditClinical: boolean;
}

export function CreatePatientDialog({ canEditClinical }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createPatient } = useCreatePatient();
  const { updatePatientClinical } = useUpdatePatientClinical();

  const stepLabels = canEditClinical
    ? ['Identity', 'Administrative', 'Clinical']
    : ['Identity', 'Administrative'];
  const lastStep = stepLabels.length - 1;

  const {
    register,
    handleSubmit,
    trigger,
    reset,
    formState: { errors },
  } = useForm<CreatePatientFormValues>({
    resolver: zodResolver(createPatientFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const resetAll = () => {
    reset(DEFAULT_VALUES);
    setStep(0);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetAll();
  };

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, lastStep));
  };

  const onSubmit = async (values: CreatePatientFormValues) => {
    setIsSubmitting(true);
    try {
      const createPayload: PatientCreateRequest = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        dateOfBirth: values.dateOfBirth || undefined,
        gender: values.gender ? (values.gender as Gender) : undefined,
        nationalId: values.nationalId || undefined,
        address: values.address || undefined,
        emergencyContactName: values.emergencyContactName || undefined,
        emergencyContactPhone: values.emergencyContactPhone || undefined,
        emergencyContactRelationship:
          values.emergencyContactRelationship || undefined,
      };

      const created = await createPatient(createPayload);

      // Optional clinical layer — only Institution Admins may set it, and only
      // when at least one clinical field was filled in. A failure here must not
      // read as "the patient wasn't created", since it already was.
      const hasClinical =
        !!values.bloodType ||
        !!values.allergies.trim() ||
        !!values.chronicConditions.trim() ||
        !!values.clinicalNotes.trim();

      if (canEditClinical && hasClinical) {
        const clinicalPayload: PatientClinicalUpdateRequest = {
          bloodType: values.bloodType ? (values.bloodType as BloodType) : null,
          allergies: parseList(values.allergies),
          chronicConditions: parseList(values.chronicConditions),
          clinicalNotes: values.clinicalNotes || null,
        };
        try {
          await updatePatientClinical(created.id, clinicalPayload);
        } catch {
          toast.warning(
            'Patient created, but clinical details could not be saved. You can add them from the patient page.',
          );
          handleOpenChange(false);
          return;
        }
      }

      toast.success('Patient registered — an invitation email has been sent');
      handleOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // All required fields live on step 1 — jump there if validation blocks submit.
  const onInvalid = () => setStep(0);
  const submit = handleSubmit(onSubmit, onInvalid);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register Patient</DialogTitle>
          <DialogDescription>
            Creates the patient account and emails them an invitation. Only the
            first step is required — the rest is optional and can be completed
            later.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator steps={stepLabels} current={step} />

        <form
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && step < lastStep) {
              e.preventDefault();
              void goNext();
            }
          }}
          className="space-y-4"
        >
          {/* Step 1 — Identity & Contact */}
          <div className={cn('space-y-4', step !== 0 && 'hidden')}>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register('fullName')} />
              {errors.fullName && (
                <p className="text-sm text-error">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-error">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && (
                <p className="text-sm text-error">{errors.phone.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  {...register('gender')}
                >
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationalId">National ID</Label>
              <Input id="nationalId" {...register('nationalId')} />
            </div>
          </div>

          {/* Step 2 — Administrative */}
          <div className={cn('space-y-4', step !== 1 && 'hidden')}>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ecName">Emergency Contact Name</Label>
              <Input id="ecName" {...register('emergencyContactName')} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ecPhone">Emergency Contact Phone</Label>
                <Input id="ecPhone" {...register('emergencyContactPhone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ecRel">Relationship</Label>
                <Input
                  id="ecRel"
                  {...register('emergencyContactRelationship')}
                />
              </div>
            </div>
          </div>

          {/* Step 3 — Clinical (Institution Admin only) */}
          {canEditClinical && (
            <div className={cn('space-y-4', step !== 2 && 'hidden')}>
              <div className="space-y-2">
                <Label htmlFor="bloodType">Blood Type</Label>
                <select
                  id="bloodType"
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
                <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                <Input
                  id="allergies"
                  {...register('allergies')}
                  placeholder="Penicillin, Peanuts"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chronicConditions">
                  Chronic Conditions (comma-separated)
                </Label>
                <Input
                  id="chronicConditions"
                  {...register('chronicConditions')}
                  placeholder="Diabetes, Hypertension"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicalNotes">Clinical Notes</Label>
                <Textarea id="clinicalNotes" {...register('clinicalNotes')} />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep((s) => Math.max(s - 1, 0))}
                >
                  Back
                </Button>
              )}
              {/* Deliberately grouped with Back, away from Next/Create — this
                  submits immediately, so it shouldn't sit right next to the
                  button that just advances a step. */}
              {step < lastStep && (
                <Button
                  type="submit"
                  variant="ghost"
                  className="text-muted-foreground"
                  disabled={isSubmitting}
                >
                  Skip remaining &amp; create
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {step < lastStep ? (
                <Button type="button" onClick={goNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
