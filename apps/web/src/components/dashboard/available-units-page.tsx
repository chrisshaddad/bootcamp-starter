'use client';

import { toast } from 'sonner';
import { BedDoubleIcon, HomeIcon, KeyRoundIcon, MapPinIcon } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { useGetAvailableUnitsQuery } from '@/store/api/endpoints/available-units.api';
import { useCreateSupportTicketMutation } from '@/store/api/endpoints/support-tickets.api';
import type { AvailableUnit } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Express-interest button ──────────────────────────────────────────────────
// Reuses the existing support-ticket create flow — no new data model. Each
// card owns its own mutation instance so the "submitting" state (and
// disabled button) is scoped to that one unit, not the whole page.

function fillTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    template,
  );
}

function UnitCard({
  unit,
  t,
}: {
  unit: AvailableUnit;
  t: Dictionary['availableUnits'];
}) {
  const [createSupportTicket, { isLoading: submitting }] =
    useCreateSupportTicketMutation();

  async function handleExpressInterest() {
    const templateValues = {
      building: unit.buildingName,
      unit: unit.unitNumber,
      floor: unit.floorName,
      bedrooms: String(unit.bedrooms),
      bathrooms: unit.bathrooms,
    };
    try {
      await createSupportTicket({
        subject: fillTemplate(t.interestSubjectTemplate, templateValues),
        description: fillTemplate(t.interestDescriptionTemplate, templateValues),
        category: 'general',
      }).unwrap();
      toast.success(t.interestSubmitted);
    } catch {
      toast.error(t.interestError);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <KeyRoundIcon className="size-4 text-teal-600" />
          {t.table.unit} {unit.unitNumber}
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <MapPinIcon className="size-3.5 shrink-0" />
          {unit.buildingName} · {unit.floorName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 py-2">
            <BedDoubleIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{unit.bedrooms}</span>
            <span className="text-[11px] text-muted-foreground">
              {t.table.bedrooms}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 py-2">
            <HomeIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{unit.bathrooms}</span>
            <span className="text-[11px] text-muted-foreground">
              {t.table.bathrooms}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 py-2">
            <span className="text-sm font-medium">{unit.sqft ?? '—'}</span>
            <span className="text-[11px] text-muted-foreground">
              {t.table.sqft}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleExpressInterest}
          disabled={submitting}
        >
          {submitting ? t.submitting : t.expressInterest}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AvailableUnitsPageProps {
  locale: string;
  dict: Dictionary;
}

export function AvailableUnitsPage({ dict }: AvailableUnitsPageProps) {
  const t = dict.availableUnits;
  const { data: units, isLoading, isError } = useGetAvailableUnitsQuery();

  const hasUnits = (units?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t.subtitle}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {t.loadError}
        </div>
      ) : !hasUnits ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <HomeIcon className="size-8 mx-auto mb-2 opacity-30" />
          {t.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {units?.map((unit) => (
            <UnitCard key={unit.id} unit={unit} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
