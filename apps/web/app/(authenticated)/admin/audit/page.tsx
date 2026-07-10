'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardList,
  Search,
} from 'lucide-react';
import type { AuditLogItem } from '@repo/contracts';
import { useAuditLogs } from '@/hooks/use-audit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Shared entrance animation, matched to the other admin consoles: sections fade
// + rise in, staggered via an inline animationDelay.
const ENTER = 'animate-in fade-in-0 slide-in-from-bottom-4 duration-500';

function enterStyle(delayMs: number) {
  return {
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'backwards' as const,
  };
}

// Turn any identifier into Title Case words. Handles camelCase / PascalCase
// (phoneNumber, PharmacyBranch), snake_case, and dot.case (auth.set_password),
// plus ALL_CAPS enums (PHARMACY_ADMIN) — so nothing raw leaks into the UI.
function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .replace(/[_.]+/g, ' ') // snake_case / dot.case → spaces
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDateTime(value: AuditLogItem['createdAt']): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Render a stored detail value for humans: humanize enum-like / token strings,
// join arrays, yes/no booleans, em-dash for empty.
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => String(item)).join(', ') : '—';
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    // ENUM_LIKE or lowercase tokens (magic_link, password) → Title Case;
    // free text (emails, addresses, brand names) is left untouched.
    if (/^[A-Z][A-Z0-9_]+$/.test(value)) return humanize(value);
    if (/^[a-z][a-z0-9_]+$/.test(value)) return humanize(value);
    return value;
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Event → human language
//
// Raw event keys (`user.create`, `auth.magic_link_requested`) are system
// identifiers. Everything a reader sees is derived here: a category (which
// drives color + filtering) and a plain-language label. The raw key is kept
// only in the row tooltip and the detail dialog for engineers.

type Category = 'create' | 'update' | 'delete' | 'login' | 'security';

// Category is the scan axis: color + filter both key off it, so a reader can
// spot destructive events (red) without reading every row.
const CATEGORY_META: Record<Category, { label: string; pill: string }> = {
  create: { label: 'Create', pill: 'bg-success/10 text-success-dark' },
  update: { label: 'Update', pill: 'bg-warning/15 text-warning-dark' },
  delete: { label: 'Delete', pill: 'bg-error/10 text-error' },
  login: { label: 'Login', pill: 'bg-primary-100 text-primary-hover' },
  security: { label: 'Security', pill: 'bg-secondary-200 text-warning-dark' },
};

const CATEGORY_ORDER: Category[] = [
  'create',
  'update',
  'delete',
  'login',
  'security',
];

interface ActionMeta {
  category: Category;
  label: string;
}

// The canonical map from raw event key to how a person reads it.
const ACTION_META: Record<string, ActionMeta> = {
  'user.create': { category: 'create', label: 'Created a new user' },
  'user.update': { category: 'update', label: 'Updated a user' },
  'user.delete': { category: 'delete', label: 'Deleted a user' },
  'user.assign_branch': {
    category: 'update',
    label: 'Assigned a user to a branch',
  },
  'profile.update': { category: 'update', label: 'Updated their profile' },
  'medicine.create': { category: 'create', label: 'Created a medicine' },
  'medicine.update': { category: 'update', label: 'Updated a medicine' },
  'medicine.delete': { category: 'delete', label: 'Deleted a medicine' },
  'pharmacy.create': { category: 'create', label: 'Created a pharmacy' },
  'pharmacy.delete': { category: 'delete', label: 'Deleted a pharmacy' },
  'branch.create': { category: 'create', label: 'Created a branch' },
  'branch.update': { category: 'update', label: 'Updated a branch' },
  'branch.delete': { category: 'delete', label: 'Deleted a branch' },
  'auth.login': { category: 'login', label: 'Logged in' },
  'auth.logout': { category: 'login', label: 'Logged out' },
  'auth.signup': { category: 'create', label: 'Signed up (new account)' },
  'auth.magic_link_requested': {
    category: 'security',
    label: 'Requested a magic link',
  },
  'auth.set_password': { category: 'security', label: 'Set a password' },
};

// Fallback for any event key not in the map above — keyword-classify so a new
// action still lands in a sensible category and reads in plain-ish language.
function keywordCategory(action: string): Category {
  const value = action.toLowerCase();
  if (/(delete|remove|revoke|suspend|ban)/.test(value)) return 'delete';
  if (/(create|add|invite|register|signup)/.test(value)) return 'create';
  if (/(login|logout|access|view|session)/.test(value)) return 'login';
  if (/(password|magic|token|security|mfa|2fa)/.test(value)) return 'security';
  return 'update';
}

function actionMeta(action: string): ActionMeta {
  return (
    ACTION_META[action] ?? {
      category: keywordCategory(action),
      label: humanize(action),
    }
  );
}

// --- details readers (details is `unknown` on the wire) --------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

interface FieldChange {
  from: unknown;
  to: unknown;
}

// Update events store `details.changes = { field: { from, to } }`. Pull that
// out (typed loosely, since it's `unknown` on the wire) or return null.
function getChanges(details: unknown): Record<string, FieldChange> | null {
  const changes = asRecord(asRecord(details)?.changes);
  if (!changes) return null;
  const out: Record<string, FieldChange> = {};
  for (const [field, value] of Object.entries(changes)) {
    const record = asRecord(value);
    if (record && 'from' in record && 'to' in record) {
      out[field] = { from: record.from, to: record.to };
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

// Flat detail fields (create/delete events) for the human list — drops internal
// id references (pharmacyId, branchId) and empty values.
function flatFields(details: unknown): [string, unknown][] {
  const record = asRecord(details);
  if (!record) return [];
  return Object.entries(record).filter(
    ([key, value]) =>
      key !== 'changes' &&
      !/id$/i.test(key) &&
      value !== null &&
      value !== undefined &&
      value !== '',
  );
}

// A short, human one-line summary of the target of the event — never a UUID.
function summarize(log: AuditLogItem): string | null {
  const changes = getChanges(log.details);
  if (changes) {
    // For updates, name the fields that changed (the detail view shows values).
    return Object.keys(changes).map(humanize).join(', ');
  }
  switch (log.action) {
    case 'user.create':
    case 'user.delete':
    case 'auth.signup':
      return readString(log.details, 'email');
    case 'medicine.create':
    case 'medicine.delete':
      return readString(log.details, 'brandName');
    case 'pharmacy.create':
    case 'pharmacy.delete':
    case 'branch.create':
    case 'branch.delete':
      return readString(log.details, 'name');
    case 'auth.login':
      return readString(log.details, 'method') === 'password'
        ? 'Via password'
        : 'Via magic link';
    case 'auth.set_password':
      return readString(log.details, 'onboarded') === 'true'
        ? 'Completed onboarding'
        : null;
    case 'user.assign_branch':
      return readString(log.details, 'branchId')
        ? 'Assigned to a branch'
        : 'Removed from branch';
    default:
      return null;
  }
}

function readString(details: unknown, key: string): string | null {
  const value = asRecord(details)?.[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

// ---------------------------------------------------------------------------

function CategoryPill({
  category,
  label,
  rawAction,
}: {
  category: Category;
  label: string;
  // Kept on the element title so engineers can still see the raw event key.
  rawAction: string;
}) {
  return (
    <span
      title={rawAction}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_META[category].pill}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}

// A filter dropdown built on DropdownMenu with modal={false} so it does NOT
// lock page scroll. Mirrors the FilterMenu used on the users console.
function FilterMenu({
  allLabel,
  value,
  options,
  onChange,
  width,
  labelFor,
}: {
  allLabel: string;
  value: string | undefined;
  options: readonly string[];
  onChange: (value: string | undefined) => void;
  width: string;
  labelFor?: (value: string) => string;
}) {
  const label = (option: string) => (labelFor ? labelFor(option) : option);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`h-9 justify-between font-normal ${width}`}
        >
          <span
            className={`truncate ${value ? 'text-gray-900' : 'text-gray-500'}`}
          >
            {value ? label(value) : allLabel}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`max-h-72 overflow-y-auto ${width}`}
      >
        <DropdownMenuItem onSelect={() => onChange(undefined)}>
          {allLabel}
          {value === undefined ? <Check className="ml-auto h-4 w-4" /> : null}
        </DropdownMenuItem>
        {options.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => onChange(option)}>
            <span className="truncate">{label(option)}</span>
            {value === option ? <Check className="ml-auto h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LogRow({ log, onView }: { log: AuditLogItem; onView: () => void }) {
  const meta = actionMeta(log.action);
  const summary = summarize(log);

  return (
    <TableRow
      onClick={onView}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onView();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View audit entry: ${meta.label}`}
      className="cursor-pointer"
    >
      <TableCell className="whitespace-nowrap text-gray-600">
        {formatDateTime(log.createdAt)}
      </TableCell>
      <TableCell>
        {log.userName ? (
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{log.userName}</p>
            {log.userEmail ? (
              <p className="truncate text-sm text-gray-500">{log.userEmail}</p>
            ) : null}
          </div>
        ) : (
          <span className="text-gray-400">System / deleted user</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <CategoryPill
            category={meta.category}
            label={meta.label}
            rawAction={log.action}
          />
          {summary ? (
            <p className="max-w-full truncate text-sm text-gray-500">
              {summary}
            </p>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium wrap-break-word text-gray-900">
        {children}
      </span>
    </div>
  );
}

// The "what happened" content: a real before → after diff for updates, a clean
// field list for create/delete, and raw JSON tucked behind a toggle.
function DetailsSection({ log }: { log: AuditLogItem }) {
  const [showRaw, setShowRaw] = useState(false);
  const changes = getChanges(log.details);
  // An update payload is `{ changes: … }` even when empty — detect that shape so
  // a no-op update reads "No fields changed" instead of falling to the flat view.
  const isUpdateShape =
    changes !== null || asRecord(log.details)?.changes !== undefined;
  const fields = isUpdateShape ? [] : flatFields(log.details);
  const hasRaw =
    log.details !== null &&
    log.details !== undefined &&
    !(typeof log.details === 'object' && Object.keys(log.details).length === 0);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">
        {changes ? 'What changed' : 'Details'}
      </p>

      {changes ? (
        <div className="rounded-lg border border-gray-100">
          {Object.entries(changes).map(([field, change]) => (
            <div
              key={field}
              className="flex flex-col gap-0.5 border-b border-gray-100 px-3 py-2 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span className="shrink-0 text-sm text-gray-500">
                {humanize(field)}
              </span>
              <span className="min-w-0 text-sm wrap-break-word sm:text-right">
                <span className="text-gray-400 line-through">
                  {formatValue(change.from)}
                </span>
                <span className="mx-1.5 text-gray-400">→</span>
                <span className="font-medium text-gray-900">
                  {formatValue(change.to)}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : fields.length > 0 ? (
        <div className="rounded-lg border border-gray-100">
          {fields.map(([field, value]) => (
            <div
              key={field}
              className="flex items-start justify-between gap-4 border-b border-gray-100 px-3 py-2 last:border-0"
            >
              <span className="shrink-0 text-sm text-gray-500">
                {humanize(field)}
              </span>
              <span className="min-w-0 text-right text-sm font-medium wrap-break-word text-gray-900">
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400">
          No additional details recorded for this entry.
        </p>
      )}

      {hasRaw ? (
        <div>
          <button
            type="button"
            onClick={() => setShowRaw((current) => !current)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                showRaw ? 'rotate-180' : ''
              }`}
            />
            {showRaw ? 'Hide raw data' : 'View raw data'}
          </button>
          {showRaw ? (
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ViewLogDialog({
  log,
  onClose,
}: {
  log: AuditLogItem;
  onClose: () => void;
}) {
  const meta = actionMeta(log.action);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{meta.label}</DialogTitle>
          <DialogDescription>{formatDateTime(log.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="px-1">
          <MetaRow label="Category">
            <CategoryPill
              category={meta.category}
              label={CATEGORY_META[meta.category].label}
              rawAction={log.action}
            />
          </MetaRow>
          <MetaRow label="Performed by">
            {log.userName ? (
              <span>
                {log.userName}
                {log.userEmail ? (
                  <span className="block text-xs font-normal text-gray-500">
                    {log.userEmail}
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="text-gray-400">System / deleted user</span>
            )}
          </MetaRow>
          <MetaRow label="Type">{humanize(log.entity)}</MetaRow>
          <MetaRow label="Record ID">
            {log.entityId ? (
              <span className="font-mono text-xs">{log.entityId}</span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </MetaRow>
          {/* Raw event key — for engineers, not the headline text. */}
          <MetaRow label="Event key">
            <span className="font-mono text-xs text-gray-500">
              {log.action}
            </span>
          </MetaRow>
        </div>

        <DetailsSection log={log} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

export default function AuditPage() {
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  // Fetch the whole feed once and filter in the client — category is derived
  // from the event key, and search spans both the human text and the raw
  // identifiers so engineers can still find a specific event.
  const { logs, total, isLoading, error, mutate } = useAuditLogs();

  const rows = useMemo(() => {
    if (!logs) return logs;
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      const meta = actionMeta(log.action);
      if (category && meta.category !== category) return false;
      if (query) {
        const haystack = [
          meta.label,
          summarize(log) ?? '',
          log.action,
          log.entity,
          log.entityId ?? '',
          log.userName ?? '',
          log.userEmail ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [logs, category, search]);

  return (
    // Fill the scroll area and let only the table body scroll — the page itself
    // never scrolls, so the heading + filters stay put and there's no window
    // scrollbar (unless the viewport is genuinely too short for the chrome).
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className={ENTER} style={enterStyle(0)}>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          A plain-language history of platform activity. Click any entry to see
          what changed and the full technical record.
        </p>
      </div>

      {/* Toolbar */}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${ENTER}`}
        style={enterStyle(70)}
      >
        <div className="relative w-full sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by user, activity, or event key…"
            className="h-9 w-full pl-9"
          />
        </div>

        <FilterMenu
          allLabel="All activity"
          value={category}
          options={CATEGORY_ORDER}
          onChange={(value) => setCategory(value as Category | undefined)}
          width="w-44"
          labelFor={(value) => CATEGORY_META[value as Category].label}
        />
      </div>

      {total !== undefined && logs !== undefined && total > logs.length ? (
        <p className="-mt-3 text-xs text-gray-500">
          Showing the {logs.length.toLocaleString()} most recent of{' '}
          {total.toLocaleString()} recorded events. Search and filters apply to
          this window.
        </p>
      ) : null}

      {/* Table */}
      <Card
        className={`flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0 ${ENTER}`}
        style={enterStyle(140)}
      >
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load audit logs
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Something went wrong while fetching the activity feed. Please try
              again.
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 flex-1" />
              </div>
            ))}
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16">
            <ClipboardList className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              No audit entries
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              {logs && logs.length > 0
                ? 'No entries match the current search and filters.'
                : 'Platform activity will appear here as actions are recorded.'}
            </p>
          </div>
        ) : (
          // Only this region scrolls; the sticky header keeps the columns
          // visible. Themed scrollbar matches the app chrome (see layout main).
          <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-white [&::-webkit-scrollbar]:w-2.5 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:h-11 [&_thead_th]:bg-white [&_thead_th]:px-4 [&_thead_th]:align-middle">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-44">When</TableHead>
                  <TableHead className="w-64">User</TableHead>
                  <TableHead>Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    onView={() => setSelected(log)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {selected ? (
        <ViewLogDialog
          key={selected.id}
          log={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
