'use client';

import { useState } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
  recordCreateRequestSchema,
  type RecordCreateRequest,
  type RecordDetailResponse,
  type RecordType,
  type ModalityType,
  type PrescriptionRoute,
} from '@repo/contracts';
import { ApiError, apiUpload } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  LAB_RESULT: 'Lab Result',
  CONSULTATION: 'Consultation',
  PRESCRIPTION: 'Prescription',
  SCAN: 'Scan / Imaging',
  VACCINATION: 'Vaccination',
};

const MODALITY_TYPES: ModalityType[] = [
  'XRAY',
  'MRI',
  'CT',
  'ULTRASOUND',
  'OTHER',
];
const ROUTES: PrescriptionRoute[] = [
  'ORAL',
  'IV',
  'TOPICAL',
  'INHALATION',
  'OTHER',
];

const opt = (v: string) => (v.trim() ? v.trim() : undefined);

// react-hook-form needs one flat shape covering every recordType's fields at
// once (so the conditionally-rendered sections can all register their
// inputs); zodResolver(recordCreateRequestSchema) still validates down to
// just the active branch, since the discriminated union strips whichever
// sibling keys don't belong to the matched recordType.
interface RecordFormValues {
  recordType: RecordType;
  recordDate: string;
  institutionOfOrigin: string;
  requestedBy: string;
  notes: string;
  labResult: { testName: string; testDate: string; labName: string };
  consultation: {
    chiefComplaint: string;
    findings: string;
    diagnosis: string;
    plan: string;
    followUpDate: string;
  };
  scan: {
    modalityType: ModalityType;
    bodyPart: string;
    radiologistName: string;
    findings: string;
  };
  vaccination: {
    vaccineName: string;
    doseNumber: string;
    administeredDate: string;
    nextDoseDate: string;
    batchNumber: string;
    administeredBy: string;
  };
  prescription: {
    prescriptionDate: string;
    items: {
      medicationName: string;
      dosage: string;
      frequency: string;
      duration: string;
      route: PrescriptionRoute;
      notes: string;
    }[];
  };
}

const emptyLine = () => ({
  medicationName: '',
  dosage: '',
  frequency: '',
  duration: '',
  route: 'ORAL' as PrescriptionRoute,
  notes: '',
});

const DEFAULT_VALUES: RecordFormValues = {
  recordType: 'LAB_RESULT',
  recordDate: '',
  institutionOfOrigin: '',
  requestedBy: '',
  notes: '',
  labResult: { testName: '', testDate: '', labName: '' },
  consultation: {
    chiefComplaint: '',
    findings: '',
    diagnosis: '',
    plan: '',
    followUpDate: '',
  },
  scan: {
    modalityType: 'XRAY',
    bodyPart: '',
    radiologistName: '',
    findings: '',
  },
  vaccination: {
    vaccineName: '',
    doseNumber: '',
    administeredDate: '',
    nextDoseDate: '',
    batchNumber: '',
    administeredBy: '',
  },
  prescription: { prescriptionDate: '', items: [emptyLine()] },
};

function toPayload(values: RecordFormValues): RecordCreateRequest {
  const base = {
    recordDate: values.recordDate,
    institutionOfOrigin: opt(values.institutionOfOrigin),
    requestedBy: opt(values.requestedBy),
    notes: opt(values.notes),
  };

  switch (values.recordType) {
    case 'LAB_RESULT':
      return {
        recordType: values.recordType,
        ...base,
        labResult: {
          testName: values.labResult.testName,
          testDate: values.labResult.testDate,
          labName: opt(values.labResult.labName),
        },
      };
    case 'CONSULTATION':
      return {
        recordType: values.recordType,
        ...base,
        consultation: {
          chiefComplaint: values.consultation.chiefComplaint,
          findings: opt(values.consultation.findings),
          diagnosis: opt(values.consultation.diagnosis),
          plan: opt(values.consultation.plan),
          followUpDate: opt(values.consultation.followUpDate),
        },
      };
    case 'SCAN':
      return {
        recordType: values.recordType,
        ...base,
        scan: {
          modalityType: values.scan.modalityType,
          bodyPart: values.scan.bodyPart,
          radiologistName: opt(values.scan.radiologistName),
          findings: opt(values.scan.findings),
        },
      };
    case 'VACCINATION':
      return {
        recordType: values.recordType,
        ...base,
        vaccination: {
          vaccineName: values.vaccination.vaccineName,
          doseNumber: values.vaccination.doseNumber
            ? Number(values.vaccination.doseNumber)
            : undefined,
          administeredDate: values.vaccination.administeredDate,
          nextDoseDate: opt(values.vaccination.nextDoseDate),
          batchNumber: opt(values.vaccination.batchNumber),
          administeredBy: opt(values.vaccination.administeredBy),
        },
      };
    case 'PRESCRIPTION':
      return {
        recordType: values.recordType,
        ...base,
        prescription: {
          prescriptionDate: values.prescription.prescriptionDate,
          items: values.prescription.items.map((line) => ({
            medicationName: line.medicationName,
            dosage: line.dosage,
            frequency: line.frequency,
            duration: opt(line.duration),
            route: line.route,
            notes: opt(line.notes),
          })),
        },
      };
  }
}

interface Props {
  createRecord: (payload: RecordCreateRequest) => Promise<RecordDetailResponse>;
}

export function AddRecordDialog({ createRecord }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(
      recordCreateRequestSchema,
    ) as unknown as Resolver<RecordFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prescription.items',
  });

  const recordType = watch('recordType');

  const onSubmit = async (values: RecordFormValues) => {
    let created: RecordDetailResponse;
    try {
      created = await createRecord(toPayload(values));
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to add record',
      );
      return;
    }

    // The record is persisted now — never re-create it. Close the dialog and
    // report any attachment-upload failure separately so a retry can't create a
    // duplicate record.
    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await apiUpload(`/records/${created.id}/files`, formData);
        // Refresh the patient's records list so the new fileCount isn't stale.
        globalMutate(
          (key) =>
            typeof key === 'string' &&
            key.startsWith(`/patients/${created.patientId}/records`),
        );
      }
      toast.success('Record added');
    } catch {
      toast.error('Record added, but the attachment failed to upload');
    } finally {
      reset(DEFAULT_VALUES);
      setFile(null);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Medical Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rec-type">Record Type</Label>
              <select
                id="rec-type"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                {...register('recordType')}
              >
                {Object.entries(RECORD_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-date">Record Date</Label>
              <Input
                id="rec-date"
                type="date"
                required
                {...register('recordDate')}
              />
              {errors.recordDate && (
                <p className="text-sm text-error">
                  {errors.recordDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Type-specific fields */}
          {recordType === 'LAB_RESULT' && (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lab-testName">Test Name</Label>
                  <Input
                    id="lab-testName"
                    required
                    {...register('labResult.testName')}
                  />
                  {errors.labResult?.testName && (
                    <p className="text-sm text-error">
                      {errors.labResult.testName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lab-testDate">Test Date</Label>
                  <Input
                    id="lab-testDate"
                    type="date"
                    required
                    {...register('labResult.testDate')}
                  />
                  {errors.labResult?.testDate && (
                    <p className="text-sm text-error">
                      {errors.labResult.testDate.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lab-labName">Lab Name</Label>
                <Input id="lab-labName" {...register('labResult.labName')} />
              </div>
            </div>
          )}

          {recordType === 'CONSULTATION' && (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="space-y-2">
                <Label htmlFor="con-cc">Chief Complaint</Label>
                <Input
                  id="con-cc"
                  required
                  {...register('consultation.chiefComplaint')}
                />
                {errors.consultation?.chiefComplaint && (
                  <p className="text-sm text-error">
                    {errors.consultation.chiefComplaint.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="con-findings">Findings</Label>
                  <Input
                    id="con-findings"
                    {...register('consultation.findings')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="con-diagnosis">Diagnosis</Label>
                  <Input
                    id="con-diagnosis"
                    {...register('consultation.diagnosis')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="con-plan">Plan</Label>
                <Input id="con-plan" {...register('consultation.plan')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="con-followup">Follow-up Date</Label>
                <Input
                  id="con-followup"
                  type="date"
                  {...register('consultation.followUpDate')}
                />
              </div>
            </div>
          )}

          {recordType === 'SCAN' && (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scan-modality">Modality</Label>
                  <select
                    id="scan-modality"
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                    {...register('scan.modalityType')}
                  >
                    {MODALITY_TYPES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scan-bodyPart">Body Part</Label>
                  <Input
                    id="scan-bodyPart"
                    required
                    {...register('scan.bodyPart')}
                  />
                  {errors.scan?.bodyPart && (
                    <p className="text-sm text-error">
                      {errors.scan.bodyPart.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-radiologist">Radiologist</Label>
                <Input
                  id="scan-radiologist"
                  {...register('scan.radiologistName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-findings">Findings</Label>
                <Input id="scan-findings" {...register('scan.findings')} />
              </div>
            </div>
          )}

          {recordType === 'VACCINATION' && (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vac-name">Vaccine Name</Label>
                  <Input
                    id="vac-name"
                    required
                    {...register('vaccination.vaccineName')}
                  />
                  {errors.vaccination?.vaccineName && (
                    <p className="text-sm text-error">
                      {errors.vaccination.vaccineName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-dose">Dose Number</Label>
                  <Input
                    id="vac-dose"
                    type="number"
                    min="1"
                    {...register('vaccination.doseNumber', {
                      // The contract coerces this to a number; an empty
                      // string must become `undefined` (absent), not `NaN`.
                      setValueAs: (v) => (v === '' ? undefined : v),
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-admDate">Administered Date</Label>
                  <Input
                    id="vac-admDate"
                    type="date"
                    required
                    {...register('vaccination.administeredDate')}
                  />
                  {errors.vaccination?.administeredDate && (
                    <p className="text-sm text-error">
                      {errors.vaccination.administeredDate.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-nextDose">Next Dose Date</Label>
                  <Input
                    id="vac-nextDose"
                    type="date"
                    {...register('vaccination.nextDoseDate')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-batch">Batch Number</Label>
                  <Input
                    id="vac-batch"
                    {...register('vaccination.batchNumber')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-by">Administered By</Label>
                  <Input
                    id="vac-by"
                    {...register('vaccination.administeredBy')}
                  />
                </div>
              </div>
            </div>
          )}

          {recordType === 'PRESCRIPTION' && (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="space-y-2">
                <Label htmlFor="pre-date">Prescription Date</Label>
                <Input
                  id="pre-date"
                  type="date"
                  required
                  {...register('prescription.prescriptionDate')}
                />
                {errors.prescription?.prescriptionDate && (
                  <p className="text-sm text-error">
                    {errors.prescription.prescriptionDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="space-y-3 rounded-md border border-border bg-muted p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        Medication {index + 1}
                      </span>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-error"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Input
                          placeholder="Medication name"
                          required
                          {...register(
                            `prescription.items.${index}.medicationName`,
                          )}
                        />
                        {errors.prescription?.items?.[index]
                          ?.medicationName && (
                          <p className="mt-1 text-sm text-error">
                            {
                              errors.prescription.items[index]?.medicationName
                                ?.message
                            }
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          placeholder="Dosage (e.g. 500mg)"
                          required
                          {...register(`prescription.items.${index}.dosage`)}
                        />
                        {errors.prescription?.items?.[index]?.dosage && (
                          <p className="mt-1 text-sm text-error">
                            {errors.prescription.items[index]?.dosage?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          placeholder="Frequency (e.g. twice daily)"
                          required
                          {...register(`prescription.items.${index}.frequency`)}
                        />
                        {errors.prescription?.items?.[index]?.frequency && (
                          <p className="mt-1 text-sm text-error">
                            {
                              errors.prescription.items[index]?.frequency
                                ?.message
                            }
                          </p>
                        )}
                      </div>
                      <Input
                        placeholder="Duration (e.g. 7 days)"
                        {...register(`prescription.items.${index}.duration`)}
                      />
                      <select
                        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                        {...register(`prescription.items.${index}.route`)}
                      >
                        {ROUTES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Notes"
                        {...register(`prescription.items.${index}.notes`)}
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => append(emptyLine())}
                >
                  <Plus className="h-4 w-4" />
                  Add Medication
                </Button>
              </div>
            </div>
          )}

          {/* Common optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rec-origin">Institution of Origin</Label>
              <Input id="rec-origin" {...register('institutionOfOrigin')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-requestedBy">Requested By</Label>
              <Input id="rec-requestedBy" {...register('requestedBy')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-notes">Notes</Label>
            <Input id="rec-notes" {...register('notes')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-file">Attachment (optional)</Label>
            <Input
              id="rec-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
