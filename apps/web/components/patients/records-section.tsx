'use client';

import { useState } from 'react';
import { FileText, Paperclip } from 'lucide-react';
import type { RecordType } from '@repo/contracts';
import { useRecords } from '@/hooks/use-records';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AddRecordDialog } from './add-record-dialog';
import { RecordDetailDialog } from './record-detail-dialog';

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  LAB_RESULT: 'Lab Result',
  CONSULTATION: 'Consultation',
  PRESCRIPTION: 'Prescription',
  SCAN: 'Scan',
  VACCINATION: 'Vaccination',
};

const TYPE_COLORS: Record<RecordType, string> = {
  LAB_RESULT: 'bg-blue text-white',
  CONSULTATION: 'bg-purple text-white',
  PRESCRIPTION: 'bg-success-light text-success-dark',
  SCAN: 'bg-orange text-white',
  VACCINATION: 'bg-teal text-white',
};

// Outlined/muted style for a chip whose type isn't currently selected.
const TYPE_COLORS_INACTIVE: Record<RecordType, string> = {
  LAB_RESULT: 'border-blue text-blue',
  CONSULTATION: 'border-purple text-purple',
  PRESCRIPTION: 'border-success-dark text-success-dark',
  SCAN: 'border-orange text-orange',
  VACCINATION: 'border-teal text-teal',
};

const ALL_RECORD_TYPES = Object.keys(RECORD_TYPE_LABELS) as RecordType[];

function RecordTypeFilters({
  selected,
  onToggle,
  onClear,
}: {
  selected: RecordType[];
  onToggle: (type: RecordType) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border px-6 py-3">
      <button
        type="button"
        onClick={onClear}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          selected.length === 0
            ? 'border-foreground bg-foreground text-background'
            : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
        }`}
      >
        All
      </button>
      {ALL_RECORD_TYPES.map((type) => {
        const isActive = selected.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggle(type)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? `border-transparent ${TYPE_COLORS[type]}`
                : `bg-transparent ${TYPE_COLORS_INACTIVE[type]} hover:opacity-80`
            }`}
          >
            {RECORD_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  patientId: string;
  canAdd: boolean;
}

export function RecordsSection({ patientId, canAdd }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<RecordType[]>([]);
  const { records, isLoading, error, createRecord } = useRecords(patientId, {
    recordTypes: selectedTypes.length ? selectedTypes : undefined,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openRecord = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const toggleType = (type: RecordType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Medical Records
        </CardTitle>
        {canAdd && <AddRecordDialog createRecord={createRecord} />}
      </CardHeader>
      <RecordTypeFilters
        selected={selectedTypes}
        onToggle={toggleType}
        onClear={() => setSelectedTypes([])}
      />
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-error">
            Failed to load records
          </div>
        ) : !records?.length ? (
          <div className="py-8 text-center text-muted-foreground">
            {selectedTypes.length
              ? 'No records match the selected filters'
              : 'No records yet'}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex cursor-pointer items-center justify-between py-3 transition-colors hover:bg-muted"
                onClick={() => openRecord(r.id)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[r.recordType]}`}
                  >
                    {RECORD_TYPE_LABELS[r.recordType]}
                  </span>
                  <div>
                    <div className="font-medium text-foreground">{r.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(r.recordDate).toLocaleDateString()} ·{' '}
                      {r.uploadedByName}
                    </div>
                  </div>
                </div>
                {r.fileCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    {r.fileCount}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <RecordDetailDialog
        recordId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        canUpload={canAdd}
      />
    </Card>
  );
}
