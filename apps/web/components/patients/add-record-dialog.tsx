'use client';

import { useState } from 'react';
import { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import type {
  RecordCreateRequest,
  RecordDetailResponse,
  RecordType,
  ModalityType,
  PrescriptionRoute,
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

interface MedicationLine {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: PrescriptionRoute;
  notes: string;
}

const emptyLine = (): MedicationLine => ({
  medicationName: '',
  dosage: '',
  frequency: '',
  duration: '',
  route: 'ORAL',
  notes: '',
});

interface Props {
  createRecord: (payload: RecordCreateRequest) => Promise<RecordDetailResponse>;
}

export function AddRecordDialog({ createRecord }: Props) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordType, setRecordType] = useState<RecordType>('LAB_RESULT');

  // Common
  const [recordDate, setRecordDate] = useState('');
  const [institutionOfOrigin, setInstitutionOfOrigin] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Per-type field state
  const [lab, setLab] = useState({ testName: '', testDate: '', labName: '' });
  const [consult, setConsult] = useState({
    chiefComplaint: '',
    findings: '',
    diagnosis: '',
    plan: '',
    followUpDate: '',
  });
  const [scan, setScan] = useState({
    modalityType: 'XRAY' as ModalityType,
    bodyPart: '',
    radiologistName: '',
    findings: '',
  });
  const [vacc, setVacc] = useState({
    vaccineName: '',
    doseNumber: '',
    administeredDate: '',
    nextDoseDate: '',
    batchNumber: '',
    administeredBy: '',
  });
  const [prescriptionDate, setPrescriptionDate] = useState('');
  const [lines, setLines] = useState<MedicationLine[]>([emptyLine()]);

  const reset = () => {
    setRecordType('LAB_RESULT');
    setRecordDate('');
    setInstitutionOfOrigin('');
    setRequestedBy('');
    setNotes('');
    setFile(null);
    setLab({ testName: '', testDate: '', labName: '' });
    setConsult({
      chiefComplaint: '',
      findings: '',
      diagnosis: '',
      plan: '',
      followUpDate: '',
    });
    setScan({
      modalityType: 'XRAY',
      bodyPart: '',
      radiologistName: '',
      findings: '',
    });
    setVacc({
      vaccineName: '',
      doseNumber: '',
      administeredDate: '',
      nextDoseDate: '',
      batchNumber: '',
      administeredBy: '',
    });
    setPrescriptionDate('');
    setLines([emptyLine()]);
  };

  const updateLine = (index: number, patch: Partial<MedicationLine>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };

  const buildPayload = (): RecordCreateRequest => {
    const base = {
      recordDate,
      institutionOfOrigin: opt(institutionOfOrigin),
      requestedBy: opt(requestedBy),
      notes: opt(notes),
    };

    switch (recordType) {
      case 'LAB_RESULT':
        return {
          recordType,
          ...base,
          labResult: {
            testName: lab.testName,
            testDate: lab.testDate,
            labName: opt(lab.labName),
          },
        };
      case 'CONSULTATION':
        return {
          recordType,
          ...base,
          consultation: {
            chiefComplaint: consult.chiefComplaint,
            findings: opt(consult.findings),
            diagnosis: opt(consult.diagnosis),
            plan: opt(consult.plan),
            followUpDate: opt(consult.followUpDate),
          },
        };
      case 'SCAN':
        return {
          recordType,
          ...base,
          scan: {
            modalityType: scan.modalityType,
            bodyPart: scan.bodyPart,
            radiologistName: opt(scan.radiologistName),
            findings: opt(scan.findings),
          },
        };
      case 'VACCINATION':
        return {
          recordType,
          ...base,
          vaccination: {
            vaccineName: vacc.vaccineName,
            doseNumber: vacc.doseNumber ? Number(vacc.doseNumber) : undefined,
            administeredDate: vacc.administeredDate,
            nextDoseDate: opt(vacc.nextDoseDate),
            batchNumber: opt(vacc.batchNumber),
            administeredBy: opt(vacc.administeredBy),
          },
        };
      case 'PRESCRIPTION':
        return {
          recordType,
          ...base,
          prescription: {
            prescriptionDate,
            items: lines.map((line) => ({
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
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let created: RecordDetailResponse;
    try {
      created = await createRecord(buildPayload());
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to add record',
      );
      setIsSubmitting(false);
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
      reset();
      setOpen(false);
      setIsSubmitting(false);
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
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Medical Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rec-type">Record Type</Label>
              <select
                id="rec-type"
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as RecordType)}
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
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Type-specific fields */}
          {recordType === 'LAB_RESULT' && (
            <div className="space-y-4 rounded-lg border border-gray-100 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lab-testName">Test Name</Label>
                  <Input
                    id="lab-testName"
                    value={lab.testName}
                    onChange={(e) =>
                      setLab({ ...lab, testName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lab-testDate">Test Date</Label>
                  <Input
                    id="lab-testDate"
                    type="date"
                    value={lab.testDate}
                    onChange={(e) =>
                      setLab({ ...lab, testDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lab-labName">Lab Name</Label>
                <Input
                  id="lab-labName"
                  value={lab.labName}
                  onChange={(e) => setLab({ ...lab, labName: e.target.value })}
                />
              </div>
            </div>
          )}

          {recordType === 'CONSULTATION' && (
            <div className="space-y-4 rounded-lg border border-gray-100 p-4">
              <div className="space-y-2">
                <Label htmlFor="con-cc">Chief Complaint</Label>
                <Input
                  id="con-cc"
                  value={consult.chiefComplaint}
                  onChange={(e) =>
                    setConsult({ ...consult, chiefComplaint: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="con-findings">Findings</Label>
                  <Input
                    id="con-findings"
                    value={consult.findings}
                    onChange={(e) =>
                      setConsult({ ...consult, findings: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="con-diagnosis">Diagnosis</Label>
                  <Input
                    id="con-diagnosis"
                    value={consult.diagnosis}
                    onChange={(e) =>
                      setConsult({ ...consult, diagnosis: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="con-plan">Plan</Label>
                <Input
                  id="con-plan"
                  value={consult.plan}
                  onChange={(e) =>
                    setConsult({ ...consult, plan: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="con-followup">Follow-up Date</Label>
                <Input
                  id="con-followup"
                  type="date"
                  value={consult.followUpDate}
                  onChange={(e) =>
                    setConsult({ ...consult, followUpDate: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {recordType === 'SCAN' && (
            <div className="space-y-4 rounded-lg border border-gray-100 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scan-modality">Modality</Label>
                  <select
                    id="scan-modality"
                    className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                    value={scan.modalityType}
                    onChange={(e) =>
                      setScan({
                        ...scan,
                        modalityType: e.target.value as ModalityType,
                      })
                    }
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
                    value={scan.bodyPart}
                    onChange={(e) =>
                      setScan({ ...scan, bodyPart: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-radiologist">Radiologist</Label>
                <Input
                  id="scan-radiologist"
                  value={scan.radiologistName}
                  onChange={(e) =>
                    setScan({ ...scan, radiologistName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-findings">Findings</Label>
                <Input
                  id="scan-findings"
                  value={scan.findings}
                  onChange={(e) =>
                    setScan({ ...scan, findings: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {recordType === 'VACCINATION' && (
            <div className="space-y-4 rounded-lg border border-gray-100 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vac-name">Vaccine Name</Label>
                  <Input
                    id="vac-name"
                    value={vacc.vaccineName}
                    onChange={(e) =>
                      setVacc({ ...vacc, vaccineName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-dose">Dose Number</Label>
                  <Input
                    id="vac-dose"
                    type="number"
                    min="1"
                    value={vacc.doseNumber}
                    onChange={(e) =>
                      setVacc({ ...vacc, doseNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-admDate">Administered Date</Label>
                  <Input
                    id="vac-admDate"
                    type="date"
                    value={vacc.administeredDate}
                    onChange={(e) =>
                      setVacc({ ...vacc, administeredDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-nextDose">Next Dose Date</Label>
                  <Input
                    id="vac-nextDose"
                    type="date"
                    value={vacc.nextDoseDate}
                    onChange={(e) =>
                      setVacc({ ...vacc, nextDoseDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-batch">Batch Number</Label>
                  <Input
                    id="vac-batch"
                    value={vacc.batchNumber}
                    onChange={(e) =>
                      setVacc({ ...vacc, batchNumber: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vac-by">Administered By</Label>
                  <Input
                    id="vac-by"
                    value={vacc.administeredBy}
                    onChange={(e) =>
                      setVacc({ ...vacc, administeredBy: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {recordType === 'PRESCRIPTION' && (
            <div className="space-y-4 rounded-lg border border-gray-100 p-4">
              <div className="space-y-2">
                <Label htmlFor="pre-date">Prescription Date</Label>
                <Input
                  id="pre-date"
                  type="date"
                  value={prescriptionDate}
                  onChange={(e) => setPrescriptionDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-4">
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Medication {index + 1}
                      </span>
                      {lines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-600"
                          onClick={() =>
                            setLines(lines.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Medication name"
                        value={line.medicationName}
                        onChange={(e) =>
                          updateLine(index, { medicationName: e.target.value })
                        }
                        required
                      />
                      <Input
                        placeholder="Dosage (e.g. 500mg)"
                        value={line.dosage}
                        onChange={(e) =>
                          updateLine(index, { dosage: e.target.value })
                        }
                        required
                      />
                      <Input
                        placeholder="Frequency (e.g. twice daily)"
                        value={line.frequency}
                        onChange={(e) =>
                          updateLine(index, { frequency: e.target.value })
                        }
                        required
                      />
                      <Input
                        placeholder="Duration (e.g. 7 days)"
                        value={line.duration}
                        onChange={(e) =>
                          updateLine(index, { duration: e.target.value })
                        }
                      />
                      <select
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                        value={line.route}
                        onChange={(e) =>
                          updateLine(index, {
                            route: e.target.value as PrescriptionRoute,
                          })
                        }
                      >
                        {ROUTES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Notes"
                        value={line.notes}
                        onChange={(e) =>
                          updateLine(index, { notes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setLines([...lines, emptyLine()])}
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
              <Input
                id="rec-origin"
                value={institutionOfOrigin}
                onChange={(e) => setInstitutionOfOrigin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-requestedBy">Requested By</Label>
              <Input
                id="rec-requestedBy"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-notes">Notes</Label>
            <Input
              id="rec-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
