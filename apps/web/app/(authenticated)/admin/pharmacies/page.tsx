'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  ChevronRight,
  GitBranch,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  type PharmacyAdminListItem,
  type PharmacyCreateRequest,
} from '@repo/contracts';
import {
  usePharmacyAdminList,
  usePharmacyActions,
} from '@/hooks/use-pharmacies';
import { usePlatformStats } from '@/hooks/use-platform-stats';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BranchFields, type BranchFieldKey } from './branch-fields';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Shared entrance animation, matched to the dashboard: sections fade + rise in,
// staggered via an inline animationDelay so they arrive one after another.
const ENTER = 'animate-in fade-in-0 slide-in-from-bottom-4 duration-500';

function enterStyle(delayMs: number) {
  return {
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'backwards' as const,
  };
}

// Full colored "at a glance" stat tiles — same palette family as the dashboard.
const STAT_STYLES = [
  {
    bg: '#EAF3DE',
    border: '#C0DD97',
    label: '#3B6D11',
    number: '#173404',
    delta: '#3B6D11',
    icon: '#27500A',
  },
  {
    bg: '#E1F5EE',
    border: '#9FE1CB',
    label: '#085041',
    number: '#04342C',
    delta: '#085041',
    icon: '#085041',
  },
  {
    bg: '#FAEEDA',
    border: '#FAC775',
    label: '#854F0B',
    number: '#412402',
    delta: '#854F0B',
    icon: '#633806',
  },
  {
    bg: '#EEEDFE',
    border: '#CECBF6',
    label: '#3C3489',
    number: '#26215C',
    delta: '#3C3489',
    icon: '#3C3489',
  },
] as const;

function formatDate(value: PharmacyAdminListItem['createdAt']): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Deterministic soft tint so a given pharmacy keeps the same avatar color.
const AVATAR_TINTS = [
  'bg-primary-100 text-primary-hover',
  'bg-secondary-200 text-warning-dark',
  'bg-success/15 text-success-dark',
  'bg-gray-200 text-gray-700',
];

function avatarTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + hash;
  return (
    AVATAR_TINTS[hash % AVATAR_TINTS.length] ?? 'bg-gray-200 text-gray-700'
  );
}

// ---------------------------------------------------------------------------

interface CountCellProps {
  icon: LucideIcon;
  value: number;
  iconClass: string;
}

// A small icon + number pill used in the branch / admin / user columns.
function CountCell({ icon: Icon, value, iconClass }: CountCellProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
      <Icon className={cn('h-4 w-4', iconClass)} />
      {value.toLocaleString()}
    </span>
  );
}

function PharmacyRow({
  pharmacy,
  onOpen,
}: {
  pharmacy: PharmacyAdminListItem;
  onOpen: () => void;
}) {
  return (
    <TableRow
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${pharmacy.name}`}
      className="group cursor-pointer"
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              avatarTint(pharmacy.id),
            )}
          >
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">
              {pharmacy.name}
            </p>
            <p className="truncate text-sm text-gray-500">
              Created {formatDate(pharmacy.createdAt)}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <CountCell
          icon={GitBranch}
          value={pharmacy.branchCount}
          iconClass="text-primary-base"
        />
      </TableCell>
      <TableCell>
        <CountCell
          icon={ShieldCheck}
          value={pharmacy.adminCount}
          iconClass="text-warning-dark"
        />
      </TableCell>
      <TableCell>
        <CountCell
          icon={Users}
          value={pharmacy.userCount}
          iconClass="text-gray-400"
        />
      </TableCell>
      <TableCell className="text-gray-600">
        <div className="flex items-center justify-between gap-2">
          {formatDate(pharmacy.createdAt)}
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-base" />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}

// The create form keeps the branch fields flat and as strings (coordinates come
// from text inputs) so the whole form validates in one pass. Branch fields are
// only required when "This pharmacy has a branch" is ticked; on submit the flat
// values are mapped to the `PharmacyCreateRequest` shape (branch → object|null).
const createPharmacyFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Pharmacy name is required').max(150),
    adminFirstName: z.string().trim().min(1, 'First name is required').max(100),
    adminLastName: z.string().trim().min(1, 'Last name is required').max(100),
    adminEmail: z.email('Enter a valid email'),
    hasBranch: z.boolean(),
    // No constraints at the object level: every branch rule is enforced inside
    // the `hasBranch` block below, so a value typed into the branch section and
    // then hidden (by unticking) can never block a branch-less submit.
    branchName: z.string().trim(),
    branchPhone: z.string().trim(),
    branchAddress: z.string().trim(),
    branchLatitude: z.string().trim(),
    branchLongitude: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasBranch) return;
    if (!data.branchName) {
      ctx.addIssue({
        path: ['branchName'],
        code: 'custom',
        message: 'Branch name is required',
      });
    } else if (data.branchName.length > 150) {
      ctx.addIssue({
        path: ['branchName'],
        code: 'custom',
        message: 'Branch name must be at most 150 characters',
      });
    }
    if (data.branchPhone.length > 20) {
      ctx.addIssue({
        path: ['branchPhone'],
        code: 'custom',
        message: 'Phone must be at most 20 characters',
      });
    }
    if (!data.branchAddress) {
      ctx.addIssue({
        path: ['branchAddress'],
        code: 'custom',
        message: 'Address is required',
      });
    }
    const lat = Number(data.branchLatitude);
    if (
      data.branchLatitude === '' ||
      Number.isNaN(lat) ||
      lat < -90 ||
      lat > 90
    ) {
      ctx.addIssue({
        path: ['branchLatitude'],
        code: 'custom',
        message: 'Latitude must be between -90 and 90',
      });
    }
    const lng = Number(data.branchLongitude);
    if (
      data.branchLongitude === '' ||
      Number.isNaN(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      ctx.addIssue({
        path: ['branchLongitude'],
        code: 'custom',
        message: 'Longitude must be between -180 and 180',
      });
    }
  });

type CreatePharmacyFormValues = z.infer<typeof createPharmacyFormSchema>;

function CreatePharmacyDialog({ onClose }: { onClose: () => void }) {
  const { createPharmacy } = usePharmacyActions();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePharmacyFormValues>({
    resolver: zodResolver(createPharmacyFormSchema),
    defaultValues: {
      name: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      hasBranch: false,
      branchName: '',
      branchPhone: '',
      branchAddress: '',
      branchLatitude: '',
      branchLongitude: '',
    },
  });

  const hasBranch = watch('hasBranch');

  const onSubmit = async (data: CreatePharmacyFormValues) => {
    const payload: PharmacyCreateRequest = {
      name: data.name,
      adminFirstName: data.adminFirstName,
      adminLastName: data.adminLastName,
      adminEmail: data.adminEmail,
      branch: data.hasBranch
        ? {
            name: data.branchName,
            phoneNumber: data.branchPhone || null,
            address: data.branchAddress,
            latitude: Number(data.branchLatitude),
            longitude: Number(data.branchLongitude),
          }
        : null,
    };
    try {
      await createPharmacy(payload);
      toast.success(`Registered ${payload.name} and invited its admin.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Failed to create pharmacy.',
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="thin-scroll max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>New pharmacy</DialogTitle>
            <DialogDescription>
              Register a pharmacy and invite its first admin. They set a
              password on first sign-in via the magic link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Field label="Pharmacy name" error={errors.name?.message}>
              <Input {...register('name')} placeholder="Acme Pharmacy" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Admin first name"
                error={errors.adminFirstName?.message}
              >
                <Input {...register('adminFirstName')} placeholder="Jane" />
              </Field>
              <Field
                label="Admin last name"
                error={errors.adminLastName?.message}
              >
                <Input {...register('adminLastName')} placeholder="Doe" />
              </Field>
            </div>

            <Field label="Admin email" error={errors.adminEmail?.message}>
              <Input
                type="email"
                {...register('adminEmail')}
                placeholder="jane@example.com"
              />
            </Field>

            {/* Optional first branch — not every pharmacy opens with one. */}
            <div className="rounded-xl border border-gray-200 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={hasBranch}
                  onCheckedChange={(checked) =>
                    setValue('hasBranch', checked === true, {
                      shouldValidate: true,
                    })
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">
                    This pharmacy has a branch
                  </span>
                  <span className="block text-xs text-gray-500">
                    Add its first branch now — you can add more later.
                  </span>
                </span>
              </label>

              {hasBranch ? (
                <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                  <BranchFields
                    register={registerBranch}
                    errors={{
                      name: errors.branchName?.message,
                      phone: errors.branchPhone?.message,
                      address: errors.branchAddress?.message,
                      latitude: errors.branchLatitude?.message,
                      longitude: errors.branchLongitude?.message,
                    }}
                    latitude={watch('branchLatitude') ?? ''}
                    longitude={watch('branchLongitude') ?? ''}
                    onLocationChange={(lat, lng) => {
                      setValue('branchLatitude', lat, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                      setValue('branchLongitude', lng, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create pharmacy'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  // Bind the shared BranchFields inputs to this form's flat branch fields.
  function registerBranch(field: BranchFieldKey) {
    const map = {
      name: 'branchName',
      phone: 'branchPhone',
      address: 'branchAddress',
      latitude: 'branchLatitude',
      longitude: 'branchLongitude',
    } as const;
    return register(map[field]);
  }
}

// ---------------------------------------------------------------------------

interface StatTile {
  label: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  newThisWeek?: number;
}

export default function PharmaciesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { pharmacies, isLoading, error, mutate } = usePharmacyAdminList();
  const { stats: platformStats } = usePlatformStats();

  // Aggregate the colored stat row from the list itself (one source of truth),
  // and borrow the genuine trailing-7-day pharmacy delta from platform stats.
  const totals = useMemo(() => {
    const list = pharmacies ?? [];
    return {
      pharmacies: list.length,
      branches: list.reduce((sum, item) => sum + item.branchCount, 0),
      admins: list.reduce((sum, item) => sum + item.adminCount, 0),
      withBranch: list.filter((item) => item.branchCount > 0).length,
    };
  }, [pharmacies]);

  const rows = useMemo(() => {
    if (!pharmacies) return pharmacies;
    const query = search.trim().toLowerCase();
    if (!query) return pharmacies;
    return pharmacies.filter((item) => item.name.toLowerCase().includes(query));
  }, [pharmacies, search]);

  const statTiles: StatTile[] = [
    {
      label: 'Total pharmacies',
      value: totals.pharmacies.toLocaleString(),
      icon: Building2,
      trend: `${totals.withBranch} with a branch`,
      newThisWeek: platformStats?.pharmacies.newThisWeek,
    },
    {
      label: 'Total branches',
      value: totals.branches.toLocaleString(),
      icon: GitBranch,
      trend: 'Across every pharmacy',
    },
    {
      label: 'Pharmacy admins',
      value: totals.admins.toLocaleString(),
      icon: ShieldCheck,
      trend: 'Invited to manage a pharmacy',
    },
    {
      label: 'With a branch',
      value: `${totals.pharmacies > 0 ? Math.round((totals.withBranch / totals.pharmacies) * 100) : 0}%`,
      icon: Store,
      trend: `${totals.withBranch} of ${totals.pharmacies} onboarded`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacies</h1>
          <p className="mt-1 text-sm text-gray-500">
            Register pharmacies, invite their admins, and track branch and staff
            growth across the platform.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-12 w-44 shrink-0 justify-center px-6 text-base"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-5 w-5" />
          New pharmacy
        </Button>
      </div>

      {/* Colored stat row — staggered entrance like the dashboard */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-stretch gap-3">
        {statTiles.map((stat, index) => {
          const Icon = stat.icon;
          const s = STAT_STYLES[index] ?? STAT_STYLES[0];
          return (
            <Card
              key={stat.label}
              className={`rounded-2xl border py-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-150 ease-in-out hover:shadow-md ${ENTER}`}
              style={{
                backgroundColor: s.bg,
                borderColor: s.border,
                borderWidth: '0.5px',
                ...enterStyle(index * 70),
              }}
            >
              <CardContent className="flex flex-1 flex-col justify-between p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className="text-[13px] font-medium"
                      style={{ color: s.label }}
                    >
                      {stat.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="mt-2 h-8 w-16 bg-black/5" />
                    ) : (
                      <p
                        className="mt-2 text-[28px] font-medium tracking-tight tabular-nums"
                        style={{ color: s.number }}
                      >
                        {stat.value}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.67)' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: s.icon }} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs" style={{ color: s.label }}>
                    {stat.trend}
                  </p>
                  {stat.newThisWeek !== undefined && (
                    <p
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                      style={{
                        color: stat.newThisWeek > 0 ? s.delta : '#9ca3af',
                      }}
                    >
                      {stat.newThisWeek > 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                      {stat.newThisWeek > 0
                        ? `+${stat.newThisWeek.toLocaleString()} this week`
                        : 'No new this week'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${ENTER}`}
        style={enterStyle(300)}
      >
        <div className="relative w-full sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search pharmacies by name…"
            className="h-9 w-full pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card
        className={`gap-0 overflow-hidden py-0 ${ENTER}`}
        style={enterStyle(360)}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load pharmacies
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Something went wrong while fetching the pharmacy list. Please try
              again.
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-9 flex-1" />
              </div>
            ))}
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              No pharmacies found
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              {search
                ? 'No pharmacies match your search.'
                : 'No pharmacies yet. Register the first one to get started.'}
            </p>
          </div>
        ) : (
          <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:align-middle">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Pharmacy</TableHead>
                <TableHead className="w-32">Branches</TableHead>
                <TableHead className="w-32">Admins</TableHead>
                <TableHead className="w-32">Users</TableHead>
                <TableHead className="w-32">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((pharmacy) => (
                <PharmacyRow
                  key={pharmacy.id}
                  pharmacy={pharmacy}
                  onOpen={() => router.push(`/admin/pharmacies/${pharmacy.id}`)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {createOpen ? (
        <CreatePharmacyDialog onClose={() => setCreateOpen(false)} />
      ) : null}
    </div>
  );
}
