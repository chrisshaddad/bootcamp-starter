'use client';

import { useState, useRef } from 'react';
import { useImports, useImportRows } from '@/hooks/use-imports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  RefreshCw,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

const EXPENSE_FIELDS = [
  'date',
  'description',
  'amount',
  'category',
  'categoryId',
  'recurrence',
  'notes',
];
const SALE_FIELDS = [
  'date',
  'description',
  'quantity',
  'unitPrice',
  'unitCost',
  'product',
  'productId',
  'recurrence',
  'notes',
];
const PRODUCT_FIELDS = ['name', 'description', 'unitPrice', 'unitCost', 'sku'];
const SERVICE_FIELDS = ['name', 'description', 'unitPrice', 'unitCost', 'sku'];

function statusBadge(status: string) {
  const map: Record<
    string,
    {
      label: string;
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
    }
  > = {
    PENDING: { label: 'Pending', variant: 'secondary' },
    PROCESSING: { label: 'Processing…', variant: 'outline' },
    COMPLETED: { label: 'Completed', variant: 'default' },
    FAILED: { label: 'Failed', variant: 'destructive' },
    PARTIAL: { label: 'Partial', variant: 'outline' },
  };
  const { label, variant } = map[status] ?? {
    label: status,
    variant: 'secondary',
  };
  return <Badge variant={variant}>{label}</Badge>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'success')
    return <CheckCircle2 className="h-4 w-4 text-[#34D39A]" />;
  if (status === 'error')
    return <XCircle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export default function ImportsPage() {
  const [open, setOpen] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [importType, setImportType] = useState<
    'EXPENSES' | 'SALES' | 'PRODUCTS' | 'SERVICES'
  >('EXPENSES');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { imports, meta, isLoading, uploadImport, reprocess, mutate } =
    useImports();
  const selectedImport = imports?.find((i) => i.id === selectedImportId);
  const { rows, meta: rowsMeta } = useImportRows(selectedImportId, {
    importStatus: selectedImport?.status,
  });

  const processHeaders = (headers: string[]) => {
    setFileHeaders(headers);
    const fields =
      importType === 'EXPENSES'
        ? EXPENSE_FIELDS
        : importType === 'PRODUCTS'
          ? PRODUCT_FIELDS
          : importType === 'SERVICES'
            ? SERVICE_FIELDS
            : SALE_FIELDS;
    const autoMap: Record<string, string> = {};
    headers.forEach((h) => {
      const match = fields.find((f) => f.toLowerCase() === h.toLowerCase());
      if (match) autoMap[h] = match;
    });
    setColumnMapping(autoMap);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const isXlsx =
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.name.toLowerCase().endsWith('.xls');

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ab = ev.target?.result as ArrayBuffer;
        const wb = XLSX.read(ab, {
          type: 'array',
          cellDates: true,
          dateNF: 'yyyy-mm-dd',
        });
        const ws = wb.Sheets[wb.SheetNames[0]!]!;
        // Convert sheet → CSV string, forcing ISO date format so backend can parse it
        // Strip trailing empty rows (e.g. TOTAL footer rows that have no date)
        const rawCsv = XLSX.utils.sheet_to_csv(ws, { dateNF: 'yyyy-mm-dd' });
        const csvLines = rawCsv.split(/\r?\n/);
        const csv = csvLines
          .filter((line, i) => {
            if (i === 0) return true; // always keep header
            if (line.replace(/,/g, '').trim() === '') return false; // skip fully empty rows
            const firstCol = line.split(',')[0]?.trim() ?? '';
            return firstCol !== ''; // skip rows with empty first column (e.g. TOTAL footer)
          })
          .join('\n');
        const b64 = btoa(unescape(encodeURIComponent(csv)));
        setFileContent(b64);
        const firstLine = csv.split(/\r?\n/)[0] ?? '';
        const headers = firstLine
          .split(',')
          .map((h) => h.trim().replace(/^"|"$/g, ''));
        processHeaders(headers);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const b64 = btoa(unescape(encodeURIComponent(text)));
        setFileContent(b64);
        const firstLine = text.split(/\r?\n/)[0] ?? '';
        const headers = firstLine
          .split(',')
          .map((h) => h.trim().replace(/^"|"$/g, ''));
        processHeaders(headers);
      };
      reader.readAsText(file);
    }
  };

  const requiredFields =
    importType === 'EXPENSES'
      ? ['date', 'description', 'amount']
      : importType === 'PRODUCTS'
        ? ['name', 'unitPrice']
        : importType === 'SERVICES'
          ? ['name', 'unitPrice']
          : ['date', 'unitPrice'];

  const mappedValues = Object.values(columnMapping).filter(Boolean);
  const missingFields = requiredFields.filter((f) => !mappedValues.includes(f));
  const canImport =
    !!fileContent && fileHeaders.length > 0 && missingFields.length === 0;

  const handleUpload = async () => {
    if (!fileContent || !fileName) return;
    setIsUploading(true);
    try {
      await uploadImport({
        type: importType,
        fileName,
        fileContent,
        columnMapping,
      });
      toast.success('Import started — processing in background');
      setOpen(false);
      setFileContent('');
      setFileHeaders([]);
      setColumnMapping({});
      setFileName('');
    } catch {
      toast.error('Failed to start import');
    } finally {
      setIsUploading(false);
    }
  };

  const appFields =
    importType === 'EXPENSES'
      ? EXPENSE_FIELDS
      : importType === 'PRODUCTS'
        ? PRODUCT_FIELDS
        : importType === 'SERVICES'
          ? SERVICE_FIELDS
          : SALE_FIELDS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Imports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta?.total ?? 0} imports total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="gap-2 border-border bg-card text-foreground hover:bg-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Import CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                {/* Type selector */}
                <div className="space-y-1">
                  <Label>Import Type</Label>
                  <Select
                    value={importType}
                    onValueChange={(v) => {
                      setImportType(
                        v as 'EXPENSES' | 'SALES' | 'PRODUCTS' | 'SERVICES',
                      );
                      setColumnMapping({});
                      setFileHeaders([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCTS">Products</SelectItem>
                      <SelectItem value="SERVICES">Services</SelectItem>
                      <SelectItem value="EXPENSES">Expenses</SelectItem>
                      <SelectItem value="SALES">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* File picker */}
                <div className="space-y-1">
                  <Label>File (CSV or Excel)</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={fileName || 'No file selected'}
                      className="flex-1 text-muted-foreground"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                    >
                      Browse
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                {/* Column mapping */}
                {fileHeaders.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Column Mapping
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Map your file columns to Margin fields. Required fields
                        are marked{' '}
                        <span className="text-destructive font-medium">*</span>.
                      </p>
                    </div>
                    <div className="max-h-56 space-y-2 overflow-y-auto">
                      {fileHeaders.map((header) => {
                        const mapped = columnMapping[header];
                        const isRequired =
                          mapped && requiredFields.includes(mapped);
                        return (
                          <div
                            key={header}
                            className="grid grid-cols-2 items-center gap-3"
                          >
                            <span className="truncate rounded bg-muted px-2 py-1 text-xs font-mono text-foreground">
                              {header}
                            </span>
                            <Select
                              value={columnMapping[header] ?? 'skip'}
                              onValueChange={(v) => {
                                setColumnMapping((prev) => ({
                                  ...prev,
                                  [header]: v === 'skip' ? '' : v,
                                }));
                              }}
                            >
                              <SelectTrigger
                                className={cn(
                                  'h-8 text-xs',
                                  isRequired && 'border-[#34D39A]/60',
                                )}
                              >
                                <SelectValue placeholder="Skip" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="skip">— Skip —</SelectItem>
                                {appFields.map((f) => (
                                  <SelectItem key={f} value={f}>
                                    {f}
                                    {requiredFields.includes(f) ? ' *' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>

                    {/* Missing required fields warning */}
                    {missingFields.length > 0 && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                        <p className="text-xs font-medium text-destructive">
                          Required fields not mapped:
                        </p>
                        <p className="mt-0.5 text-xs text-destructive/80">
                          {missingFields.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={isUploading || !canImport}
                  className="w-full"
                >
                  {isUploading ? 'Uploading…' : 'Start Import'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Import list */}
        <div className="lg:col-span-3">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">
                Import History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : !imports?.length ? (
                <div className="p-10 text-center">
                  <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No imports yet. Upload a CSV to get started.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {imports.map((imp) => (
                    <button
                      key={imp.id}
                      onClick={() =>
                        setSelectedImportId(
                          imp.id === selectedImportId ? null : imp.id,
                        )
                      }
                      className={cn(
                        'w-full p-4 text-left transition-colors hover:bg-muted/30',
                        selectedImportId === imp.id && 'bg-primary/10',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">
                            {imp.fileName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{imp.type}</span>
                            <span>·</span>
                            <span>
                              {imp.successCount}/{imp.rowCount} rows OK
                            </span>
                            {imp.errorCount > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-destructive">
                                  {imp.errorCount} errors
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {statusBadge(imp.status)}
                          {(imp.status === 'FAILED' ||
                            imp.status === 'PARTIAL') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                reprocess(imp.id).then(() =>
                                  toast.success('Reprocessing started'),
                                );
                              }}
                            >
                              Reprocess
                            </Button>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row details */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">
                {selectedImportId ? 'Row Details' : 'Select an import'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedImportId ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Click an import to view its rows.
                </div>
              ) : !rows ? (
                <div className="space-y-2 p-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded" />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <div className="p-3 text-xs text-muted-foreground">
                    {rowsMeta?.total ?? 0} rows total
                  </div>
                  {rows.map((row) => {
                    const data = (row.rawData ?? {}) as Record<string, string>;
                    // Pick the most meaningful label fields regardless of import type
                    const label =
                      data.description ||
                      data.name ||
                      data.date ||
                      `Row ${row.rowNumber}`;
                    const sub = [
                      data.date,
                      data.amount
                        ? `$${parseFloat(data.amount).toFixed(2)}`
                        : null,
                      data.unitPrice
                        ? `$${parseFloat(data.unitPrice).toFixed(2)}`
                        : null,
                      data.category,
                      data.product,
                      data.sku,
                    ]
                      .filter(Boolean)
                      .join(' · ');

                    return (
                      <div
                        key={row.id}
                        className="flex items-start gap-3 p-3 text-xs"
                      >
                        <StatusIcon status={row.status} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium text-foreground">
                              {label}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground/60">
                              #{row.rowNumber}
                            </span>
                          </div>
                          {sub && (
                            <p className="mt-0.5 truncate text-muted-foreground">
                              {sub}
                            </p>
                          )}
                          {row.errorMsg && (
                            <p className="mt-0.5 truncate text-destructive">
                              {row.errorMsg}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
