'use client';

import { useState } from 'react';
import { useAiInsights } from '@/hooks/use-ai-insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import type { AiInsightGenerateRequest } from '@repo/contracts';

const INSIGHT_TYPES = [
  { value: 'PROFITABILITY', label: 'Profitability Analysis' },
  { value: 'EXPENSE', label: 'Expense Analysis' },
  { value: 'REVENUE', label: 'Revenue Analysis' },
  { value: 'GOAL', label: 'Goal Review' },
];

const TYPE_COLORS: Record<string, string> = {
  PROFITABILITY: '#7C4DFF',
  EXPENSE: '#FBBF24',
  REVENUE: '#34D39A',
  GOAL: '#22D3EE',
};

function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function AiInsightsPage() {
  const [open, setOpen] = useState(false);
  const [genType, setGenType] =
    useState<AiInsightGenerateRequest['type']>('PROFITABILITY');
  const [periodStart, setPeriodStart] = useState(firstOfMonth());
  const [periodEnd, setPeriodEnd] = useState(today());
  const [isGenerating, setIsGenerating] = useState(false);

  const { insights, meta, isLoading, generateInsight, mutate } =
    useAiInsights();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateInsight({
        type: genType,
        periodStart,
        periodEnd,
      });
      toast.success(res.message);
      setOpen(false);
      setTimeout(mutate, 6000);
    } catch {
      toast.error('Failed to generate insight');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gemini-powered recommendations based on your pre-computed metrics.
            {meta?.total ? ` ${meta.total} insights generated.` : ''}
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
                <Sparkles className="h-4 w-4" />
                Generate Insight
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate AI Insight</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Metrics are computed in real-time from your data. Gemini will
                  interpret them and provide recommendations.
                </p>

                <div className="space-y-1">
                  <Label>Analysis Type</Label>
                  <Select
                    value={genType}
                    onValueChange={(v) =>
                      setGenType(v as AiInsightGenerateRequest['type'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSIGHT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="periodStart">Period Start</Label>
                    <Input
                      id="periodStart"
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="periodEnd">Period End</Label>
                    <Input
                      id="periodEnd"
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/5 p-3">
                  <p className="text-xs text-[#FBBF24]">
                    <span className="font-medium">Note:</span> Requires a{' '}
                    <code className="font-mono">GEMINI_API_KEY</code> in your
                    API environment. Without it, a placeholder insight will be
                    returned.
                  </p>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isGenerating ? 'Generating…' : 'Generate'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Insights list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !insights?.length ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-12 text-center">
            <Lightbulb className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No insights generated yet.
            </p>
            <Button
              variant="link"
              className="mt-2 text-primary"
              onClick={() => setOpen(true)}
            >
              Generate your first insight
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id} className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        style={{
                          backgroundColor:
                            TYPE_COLORS[insight.type] ?? '#7C4DFF',
                          color: 'white',
                        }}
                        className="text-xs"
                      >
                        {insight.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {insight.periodStart} → {insight.periodEnd}
                      </span>
                    </div>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {insight.title}
                    </CardTitle>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(insight.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {insight.summary}
                </p>

                {insight.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Recommendations
                    </p>
                    <ul className="space-y-1.5">
                      {insight.recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
