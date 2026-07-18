'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Paperclip, Upload } from 'lucide-react';
import { useRecord, recordFileDownloadUrl } from '@/hooks/use-records';
import { ApiError } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function fmt(value: string | Date | null | undefined): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

interface Props {
  recordId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canUpload: boolean;
}

export function RecordDetailDialog({
  recordId,
  open,
  onOpenChange,
  canUpload,
}: Props) {
  const { record, isLoading, uploadFile } = useRecord(recordId, {
    enabled: open,
  });
  const [uploading, setUploading] = useState(false);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      await uploadFile(file);
      toast.success('File attached');
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'Failed to upload file',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Details</DialogTitle>
        </DialogHeader>

        {isLoading || !record ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-gray-100">
              <DetailRow
                label="Type"
                value={record.recordType.replace(/_/g, ' ')}
              />
              <DetailRow label="Record Date" value={fmt(record.recordDate)} />
              <DetailRow label="Uploaded By" value={record.uploadedByName} />
              <DetailRow
                label="Institution of Origin"
                value={record.institutionOfOrigin}
              />
              <DetailRow label="Requested By" value={record.requestedBy} />
              <DetailRow label="Notes" value={record.notes} />

              {record.labResult && (
                <>
                  <DetailRow
                    label="Test Name"
                    value={record.labResult.testName}
                  />
                  <DetailRow
                    label="Test Date"
                    value={fmt(record.labResult.testDate)}
                  />
                  <DetailRow
                    label="Lab Name"
                    value={record.labResult.labName}
                  />
                </>
              )}

              {record.consultation && (
                <>
                  <DetailRow
                    label="Chief Complaint"
                    value={record.consultation.chiefComplaint}
                  />
                  <DetailRow
                    label="Findings"
                    value={record.consultation.findings}
                  />
                  <DetailRow
                    label="Diagnosis"
                    value={record.consultation.diagnosis}
                  />
                  <DetailRow label="Plan" value={record.consultation.plan} />
                  <DetailRow
                    label="Follow-up"
                    value={fmt(record.consultation.followUpDate)}
                  />
                </>
              )}

              {record.scan && (
                <>
                  <DetailRow
                    label="Modality"
                    value={record.scan.modalityType}
                  />
                  <DetailRow label="Body Part" value={record.scan.bodyPart} />
                  <DetailRow
                    label="Radiologist"
                    value={record.scan.radiologistName}
                  />
                  <DetailRow label="Findings" value={record.scan.findings} />
                </>
              )}

              {record.vaccination && (
                <>
                  <DetailRow
                    label="Vaccine"
                    value={record.vaccination.vaccineName}
                  />
                  <DetailRow
                    label="Dose Number"
                    value={record.vaccination.doseNumber}
                  />
                  <DetailRow
                    label="Administered"
                    value={fmt(record.vaccination.administeredDate)}
                  />
                  <DetailRow
                    label="Next Dose"
                    value={fmt(record.vaccination.nextDoseDate)}
                  />
                  <DetailRow
                    label="Batch"
                    value={record.vaccination.batchNumber}
                  />
                  <DetailRow
                    label="Administered By"
                    value={record.vaccination.administeredBy}
                  />
                </>
              )}
            </div>

            {record.prescription && (
              <div>
                <div className="mb-2 text-sm font-medium text-foreground">
                  Medications ({fmt(record.prescription.prescriptionDate)})
                </div>
                <div className="space-y-2">
                  {record.prescription.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-border bg-muted p-3 text-sm"
                    >
                      <div className="font-medium text-foreground">
                        {item.medicationName}
                      </div>
                      <div className="text-muted-foreground">
                        {item.dosage} · {item.frequency}
                        {item.duration ? ` · ${item.duration}` : ''} ·{' '}
                        {item.route}
                      </div>
                      {item.notes && (
                        <div className="mt-1 text-muted-foreground">{item.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Paperclip className="h-4 w-4" />
                Attachments
              </div>
              {record.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments</p>
              ) : (
                <ul className="space-y-1">
                  {record.files.map((f) => (
                    <li key={f.id}>
                      <a
                        href={recordFileDownloadUrl(record.id, f.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary-base hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        {f.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {canUpload && (
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Attach a file'}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
