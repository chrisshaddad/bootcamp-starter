'use client';

import {
  KeyRoundIcon,
  BuildingIcon,
  BedDoubleIcon,
  BathIcon,
  RulerIcon,
  Building2Icon,
} from 'lucide-react';

import { useGetAvailableUnitsQuery } from '@/store/api/endpoints/available-units.api';
import type { AvailableUnit } from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';
import { getPortalDict, type PortalDict } from '@/components/portal/portal-dict';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  locale: string;
  dict: Dictionary;
};

export function PortalAvailableUnits({ locale, dict }: Props) {
  const t = getPortalDict(dict, locale);
  const { data: units, isLoading, isError } = useGetAvailableUnitsQuery();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
          <KeyRoundIcon className="size-5 text-amber-600 dark:text-amber-400" />
          {t.availableUnits.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.availableUnits.subtitle}
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : isError ? (
        <Card className="ring-amber-200/50 dark:ring-amber-900/30">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t.availableUnits.loadError}
          </CardContent>
        </Card>
      ) : !units || units.length === 0 ? (
        <Card className="border-dashed ring-amber-200/60 dark:ring-amber-900/30">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
              <Building2Icon className="size-7" />
            </span>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t.availableUnits.empty}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {units.map((unit) => (
            <li key={unit.id}>
              <UnitCard unit={unit} t={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Pure display — no "express interest", no actions of any kind (per TP3 scope).
function UnitCard({ unit, t }: { unit: AvailableUnit; t: PortalDict }) {
  return (
    <Card className="h-full ring-foreground/10">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <KeyRoundIcon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">
              {t.support.unit} {unit.unitNumber}
            </span>
            <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <BuildingIcon className="size-3.5" />
              {unit.buildingName}
            </span>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-4">
          <Spec
            icon={<Building2Icon className="size-4" />}
            label={t.availableUnits.floor}
            value={unit.floorName}
          />
          <Spec
            icon={<BedDoubleIcon className="size-4" />}
            label={t.availableUnits.bedrooms}
            value={String(unit.bedrooms)}
          />
          <Spec
            icon={<BathIcon className="size-4" />}
            label={t.availableUnits.bathrooms}
            value={unit.bathrooms}
          />
          {unit.sqft != null && (
            <Spec
              icon={<RulerIcon className="size-4" />}
              label={t.availableUnits.area}
              value={`${unit.sqft} ${t.availableUnits.sqftUnit}`}
            />
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

function Spec({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-[11px] text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-medium text-foreground">
          {value}
        </dd>
      </div>
    </div>
  );
}
