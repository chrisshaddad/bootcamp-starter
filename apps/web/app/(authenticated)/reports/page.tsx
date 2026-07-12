'use client';

import { useState } from 'react';
import { useReport } from '@/hooks/use-monthly-report';
import { MonthPicker } from '@/components/reports/month-picker';
import { ReportDocument } from '@/components/reports/report-document';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Download, RefreshCw, AlertCircle } from 'lucide-react';

type ReportType = 'MONTHLY' | 'RANGE';

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

export default function ReportsPage() {
  const now = new Date();
  const [reportType, setReportType] = useState<ReportType>('MONTHLY');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());

  const invalidRange = reportType === 'RANGE' && dateFrom > dateTo;

  const { report, isLoading, error, mutate } = useReport(
    reportType === 'MONTHLY'
      ? { type: 'MONTHLY', year, month }
      : { type: 'RANGE', dateFrom, dateTo },
  );

  const handleExport = () => {
    // Browser print dialog → "Save as PDF". Print CSS in globals.css hides the
    // app chrome and repeats the report header on every page.
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ── Controls (hidden when printing) ── */}
      <div className="space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Generate a detailed report and export it as a PDF.
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
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isLoading || !report}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="space-y-5 p-5">
            {/* Step 1 — report type */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="w-full sm:w-64">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Report type
                </p>
                <Select
                  value={reportType}
                  onValueChange={(v) => setReportType(v as ReportType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly report</SelectItem>
                    <SelectItem value="RANGE">Custom date range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="hidden max-w-sm items-start gap-2 text-xs leading-relaxed text-muted-foreground sm:flex">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Choose a report type, pick the period, then export. Covers
                  revenue, profitability, expenses, margins, goals and AI
                  insights.
                </span>
              </p>
            </div>

            {/* Step 2 — period */}
            {reportType === 'MONTHLY' ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Select month
                </p>
                <MonthPicker
                  year={year}
                  month={month}
                  onChange={(y, m) => {
                    setYear(y);
                    setMonth(m);
                  }}
                />
              </div>
            ) : (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Select date range
                </p>
                <div className="grid max-w-md gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dateFrom">From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      max={dateTo}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dateTo">To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      min={dateFrom}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Report preview / document ── */}
      {invalidRange ? (
        <Card className="border-border bg-card print:hidden">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              The start date must be on or before the end date.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="mx-auto w-full max-w-[820px] space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5 print:hidden">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-foreground">
              Couldn&apos;t load the report for this period. Try refreshing.
            </p>
          </CardContent>
        </Card>
      ) : report ? (
        <ReportDocument report={report} />
      ) : null}
    </div>
  );
}
