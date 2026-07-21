'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  MoreHorizontalIcon,
  ContactIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import {
  useListRentersQuery,
  useCreateRenterMutation,
  useUpdateRenterMutation,
  useDeleteRenterMutation,
} from '@/store/api/endpoints/renters.api';
import type {
  RenterEffectiveStatus,
  RenterResponse,
  ApiErrorEnvelope,
} from '@/types/api';
import type { Dictionary } from '@/i18n/get-dictionary';

// ── Status badge ─────────────────────────────────────────────────────────────

function RenterStatusBadge({
  status,
  labels,
}: {
  status: RenterEffectiveStatus;
  labels: Dictionary['renters']['status'];
}) {
  switch (status) {
    case 'current':
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-200"
        >
          {labels.current}
        </Badge>
      );
    case 'former':
      return <Badge variant="secondary">{labels.former}</Badge>;
    case 'none':
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {labels.none}
        </Badge>
      );
  }
}

// ── Zod schema ────────────────────────────────────────────────────────────────

function buildRenterSchema(t: Dictionary['renters']['dialog']) {
  return z.object({
    fullName: z.string().min(1, t.fullNameRequired),
    email: z.string().email(t.invalidEmail).optional().or(z.literal('')),
    phone: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    notes: z.string().optional(),
  });
}

type RenterFormValues = z.infer<ReturnType<typeof buildRenterSchema>>;

const EMPTY_VALUES: RenterFormValues = {
  fullName: '',
  email: '',
  phone: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
};

// ── Create-only: optional tenant portal login section (Sprint TP1) ───────────
// An admin creating a renter may also mint a Keycloak tenant login in the same
// step. `portalEmail`/`portalPassword` are only required when the toggle is on
// — enforced via `superRefine` so the base `RenterFormValues` shape (shared
// with the edit form, which has no portal-login section) stays untouched.
function buildCreateRenterSchema(t: Dictionary['renters']['dialog']) {
  return buildRenterSchema(t)
    .extend({
      createPortalLogin: z.boolean(),
      portalEmail: z.string().optional(),
      portalPassword: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (!values.createPortalLogin) return;

      const email = values.portalEmail?.trim() ?? '';
      if (!email) {
        ctx.addIssue({
          code: 'custom',
          message: t.portalLogin.emailRequired,
          path: ['portalEmail'],
        });
      } else if (!z.string().email().safeParse(email).success) {
        ctx.addIssue({
          code: 'custom',
          message: t.portalLogin.invalidEmail,
          path: ['portalEmail'],
        });
      }

      const password = values.portalPassword ?? '';
      if (!password) {
        ctx.addIssue({
          code: 'custom',
          message: t.portalLogin.passwordRequired,
          path: ['portalPassword'],
        });
      } else if (password.length < 8) {
        ctx.addIssue({
          code: 'custom',
          message: t.portalLogin.passwordMinLength,
          path: ['portalPassword'],
        });
      }
    });
}

type CreateRenterFormValues = z.infer<
  ReturnType<typeof buildCreateRenterSchema>
>;

const CREATE_EMPTY_VALUES: CreateRenterFormValues = {
  ...EMPTY_VALUES,
  createPortalLogin: false,
  portalEmail: '',
  portalPassword: '',
};

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';

/**
 * A strong, random password for the "Generate" button. Avoids visually
 * ambiguous characters (0/O, 1/l/I) since an admin may need to read it aloud
 * or retype it for the tenant.
 */
function generateStrongPassword(length = 14): string {
  const bytes = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * PASSWORD_CHARS.length);
    }
  }
  return Array.from(bytes, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join(
    '',
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface RentersPageProps {
  /** When false (non-admin), hide all write actions. */
  canWrite: boolean;
  locale: string;
  dict: Dictionary;
}

export function RentersPage({ canWrite, locale, dict }: RentersPageProps) {
  const t = dict.renters;
  const router = useRouter();
  const { data: renters, isLoading, isError } = useListRentersQuery();
  const [createRenter, { isLoading: creating }] = useCreateRenterMutation();
  const [updateRenter, { isLoading: updating }] = useUpdateRenterMutation();
  const [deleteRenter, { isLoading: deleting }] = useDeleteRenterMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RenterResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RenterResponse | null>(null);
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  // Set once, right after a successful create-with-login — shown exactly once
  // for handoff to the tenant, then discarded (never persisted or refetched).
  const [portalCredentials, setPortalCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const renterSchema = useMemo(() => buildRenterSchema(t.dialog), [t.dialog]);
  const createRenterSchema = useMemo(
    () => buildCreateRenterSchema(t.dialog),
    [t.dialog],
  );

  const {
    register: regCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    control: controlCreate,
    watch: watchCreate,
    getValues: getCreateValues,
    setValue: setCreateValue,
    formState: { errors: createErrors },
  } = useForm<CreateRenterFormValues>({
    resolver: zodResolver(createRenterSchema),
    defaultValues: CREATE_EMPTY_VALUES,
  });

  const {
    register: regEdit,
    handleSubmit: handleEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<RenterFormValues>({
    resolver: zodResolver(renterSchema),
    defaultValues: EMPTY_VALUES,
  });

  const createPortalLogin = watchCreate('createPortalLogin');

  function goToRenter(renterId: string) {
    router.push(`/${locale}/dashboard/renters/${renterId}`);
  }

  function closeCreateDialog() {
    setCreateOpen(false);
    setShowPortalPassword(false);
    resetCreate(CREATE_EMPTY_VALUES);
  }

  async function onCreateSubmit(values: CreateRenterFormValues) {
    // Only forward portalLogin when the toggle is on AND both fields passed
    // validation — guards against a stale/partial value if the toggle was
    // flipped off after typing.
    const portalEmail = values.createPortalLogin
      ? (values.portalEmail?.trim() ?? '')
      : '';
    const portalPassword = values.createPortalLogin
      ? (values.portalPassword ?? '')
      : '';
    try {
      await createRenter({
        fullName: values.fullName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        emergencyContactName: values.emergencyContactName || undefined,
        emergencyContactPhone: values.emergencyContactPhone || undefined,
        notes: values.notes || undefined,
        ...(portalEmail && portalPassword
          ? { portalLogin: { email: portalEmail, password: portalPassword } }
          : {}),
      }).unwrap();
      toast.success(t.dialog.createdToast);
      setCreateOpen(false);
      setShowPortalPassword(false);
      if (portalEmail && portalPassword) {
        // Hand off the credentials once — the dialog close resets the form,
        // so this is the only place they're readable after this point.
        setPortalCredentials({ email: portalEmail, password: portalPassword });
      }
      resetCreate(CREATE_EMPTY_VALUES);
    } catch (err) {
      const apiErr = err as Partial<ApiErrorEnvelope>;
      if (portalEmail && apiErr?.status === 409) {
        // Keycloak username (email) already taken — dialog stays open (we
        // never call setCreateOpen(false) on this path) so the admin can fix
        // the email and resubmit.
        toast.error(t.dialog.portalLogin.emailConflictError);
      } else {
        toast.error(t.dialog.createErrorToast);
      }
    }
  }

  function openEdit(renter: RenterResponse) {
    setEditTarget(renter);
    resetEdit({
      fullName: renter.fullName,
      email: renter.email ?? '',
      phone: renter.phone ?? '',
      emergencyContactName: renter.emergencyContactName ?? '',
      emergencyContactPhone: renter.emergencyContactPhone ?? '',
      notes: renter.notes ?? '',
    });
  }

  async function onEditSubmit(values: RenterFormValues) {
    if (!editTarget) return;
    try {
      await updateRenter({
        id: editTarget.id,
        body: {
          fullName: values.fullName,
          email: values.email || undefined,
          phone: values.phone || undefined,
          emergencyContactName: values.emergencyContactName || undefined,
          emergencyContactPhone: values.emergencyContactPhone || undefined,
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success(t.dialog.updatedToast);
      setEditTarget(null);
    } catch {
      toast.error(t.dialog.updateErrorToast);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteRenter(deleteTarget.id).unwrap();
      toast.success(t.dialog.deletedToast);
      setDeleteTarget(null);
    } catch {
      toast.error(t.dialog.deleteErrorToast);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.list.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {canWrite ? t.list.subtitleWrite : t.list.subtitleReadOnly}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canWrite && (
            <Badge
              variant="outline"
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <EyeIcon className="size-3" />
              {t.list.readOnly}
            </Badge>
          )}
          {canWrite && (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              {t.list.addRenter}
            </Button>
          )}
        </div>
      </div>

      {/* Renters table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.list.table.fullName}</TableHead>
              <TableHead>{t.list.table.email}</TableHead>
              <TableHead>{t.list.table.phone}</TableHead>
              <TableHead>{t.list.table.status}</TableHead>
              {canWrite && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    {canWrite && <TableCell />}
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t.list.loadError}
                </TableCell>
              </TableRow>
            ) : renters?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 5 : 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <ContactIcon className="size-8 mx-auto mb-2 opacity-30" />
                  {canWrite ? t.list.emptyWrite : t.list.empty}
                </TableCell>
              </TableRow>
            ) : (
              renters?.map((renter) => (
                <TableRow
                  key={renter.id}
                  className="cursor-pointer hover:bg-muted/40"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToRenter(renter.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToRenter(renter.id);
                    }
                  }}
                >
                  <TableCell>
                    <span className="font-medium text-sm">
                      {renter.fullName}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {renter.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {renter.phone ?? '—'}
                  </TableCell>
                  <TableCell>
                    <RenterStatusBadge
                      status={renter.effectiveStatus}
                      labels={t.status}
                    />
                  </TableCell>
                  {canWrite && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t.list.actionsLabel}
                            >
                              <MoreHorizontalIcon />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => goToRenter(renter.id)}
                          >
                            <EyeIcon className="size-3.5 mr-1.5" />
                            {t.list.view}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(renter)}>
                            <PencilIcon className="size-3.5 mr-1.5" />
                            {dict.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(renter)}
                          >
                            <TrashIcon className="size-3.5 mr-1.5" />
                            {dict.common.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Create Renter Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open) setCreateOpen(true);
          else closeCreateDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.addTitle}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreate(onCreateSubmit)}
            className="flex flex-col gap-4"
          >
            <RenterFormFields
              idPrefix="r"
              // `regCreate` is `UseFormRegister<CreateRenterFormValues>`, a
              // strict superset of `RenterFormValues` (same base fields, plus
              // the portal-login ones). `RenterFormFields` only ever
              // registers the shared base fields, so this is safe — but TS
              // can't verify cross-form-shape register() assignability on
              // its own.
              register={
                regCreate as unknown as ReturnType<
                  typeof useForm<RenterFormValues>
                >['register']
              }
              errors={createErrors}
              t={t.dialog}
            />

            {/* ── Optional tenant portal login (Sprint TP1) ─────────────── */}
            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <Controller
                  control={controlCreate}
                  name="createPortalLogin"
                  render={({ field }) => (
                    <Checkbox
                      id="r-create-portal-login"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        const next = checked === true;
                        field.onChange(next);
                        // Prefill the login email from the renter's own
                        // email, if any — only when the admin hasn't already
                        // typed one in.
                        if (next && !getCreateValues('portalEmail')) {
                          const baseEmail = getCreateValues('email');
                          if (baseEmail) {
                            setCreateValue('portalEmail', baseEmail);
                          }
                        }
                      }}
                      className="mt-0.5"
                    />
                  )}
                />
                <div className="flex flex-col gap-0.5">
                  <Label
                    htmlFor="r-create-portal-login"
                    className="font-normal"
                  >
                    {t.dialog.portalLogin.toggleLabel}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t.dialog.portalLogin.toggleHelp}
                  </p>
                </div>
              </div>

              {createPortalLogin && (
                <div className="flex flex-col gap-3 ps-6">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="r-portal-email">
                      {t.dialog.portalLogin.emailLabel}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="r-portal-email"
                      type="email"
                      placeholder={t.dialog.portalLogin.placeholderEmail}
                      aria-invalid={!!createErrors.portalEmail}
                      {...regCreate('portalEmail')}
                    />
                    {createErrors.portalEmail && (
                      <p className="text-xs text-destructive">
                        {createErrors.portalEmail.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="r-portal-password">
                      {t.dialog.portalLogin.passwordLabel}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Input
                          id="r-portal-password"
                          type={showPortalPassword ? 'text' : 'password'}
                          placeholder={t.dialog.portalLogin.placeholderPassword}
                          aria-invalid={!!createErrors.portalPassword}
                          className="pe-9"
                          {...regCreate('portalPassword')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="absolute inset-y-0 end-0 my-auto"
                          aria-label={
                            showPortalPassword
                              ? t.dialog.portalLogin.hidePassword
                              : t.dialog.portalLogin.showPassword
                          }
                          onClick={() => setShowPortalPassword((prev) => !prev)}
                        >
                          {showPortalPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const generated = generateStrongPassword();
                          setCreateValue('portalPassword', generated, {
                            shouldValidate: true,
                          });
                          setShowPortalPassword(true);
                        }}
                      >
                        <RefreshCwIcon className="size-3.5" />
                        {t.dialog.portalLogin.generate}
                      </Button>
                    </div>
                    {createErrors.portalPassword && (
                      <p className="text-xs text-destructive">
                        {createErrors.portalPassword.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={closeCreateDialog}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={creating}>
                {creating ? t.dialog.creating : t.dialog.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Renter Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.dialog.editTitle}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEdit(onEditSubmit)}
            className="flex flex-col gap-4"
          >
            <RenterFormFields
              idPrefix="re"
              register={regEdit}
              errors={editErrors}
              t={t.dialog}
            />
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" type="button" />}
                onClick={() => setEditTarget(null)}
              >
                {dict.common.cancel}
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? t.dialog.saving : dict.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t.dialog.deleteTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-sm text-muted-foreground">
              {(() => {
                const [before, after] = t.dialog.deleteConfirm.split('{name}');
                return (
                  <>
                    {before}
                    <span className="font-medium text-foreground">
                      {deleteTarget?.fullName}
                    </span>
                    {after}
                  </>
                );
              })()}
            </p>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              onClick={() => setDeleteTarget(null)}
            >
              {dict.common.cancel}
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t.dialog.deleting : dict.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Portal Login Credentials (shown once for handoff) ─────────────── */}
      <Dialog
        open={!!portalCredentials}
        onOpenChange={(open) => {
          if (!open) setPortalCredentials(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.dialog.portalLogin.successTitle}</DialogTitle>
            <DialogDescription>
              {t.dialog.portalLogin.successDescription}
            </DialogDescription>
          </DialogHeader>
          {portalCredentials && (
            <div className="flex flex-col gap-3">
              <CredentialRow
                label={t.dialog.portalLogin.emailFieldLabel}
                value={portalCredentials.email}
                copyLabel={t.dialog.portalLogin.copyEmailLabel}
                copiedText={t.dialog.portalLogin.copied}
              />
              <CredentialRow
                label={t.dialog.portalLogin.passwordFieldLabel}
                value={portalCredentials.password}
                copyLabel={t.dialog.portalLogin.copyPasswordLabel}
                copiedText={t.dialog.portalLogin.copied}
              />
            </div>
          )}
          <DialogFooter>
            <DialogClose
              render={<Button type="button" />}
              onClick={() => setPortalCredentials(null)}
            >
              {t.dialog.portalLogin.done}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Portal login credentials row (copy-to-clipboard) ──────────────────────────

function CredentialRow({
  label,
  value,
  copyLabel,
  copiedText,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedText: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable/denied — the value is still visible to
      // select and copy manually.
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1.5">
        <code className="flex-1 truncate rounded-md border bg-muted px-2 py-1.5 font-mono text-sm">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={copyLabel}
          onClick={handleCopy}
        >
          {copied ? <CheckIcon className="text-green-600" /> : <CopyIcon />}
        </Button>
      </div>
      {copied && (
        <p className="text-xs text-muted-foreground">{copiedText}</p>
      )}
    </div>
  );
}

// ── Shared form fields (create + edit dialogs) ────────────────────────────────

function RenterFormFields({
  idPrefix,
  register,
  errors,
  t,
}: {
  idPrefix: string;
  register: ReturnType<typeof useForm<RenterFormValues>>['register'];
  errors: ReturnType<typeof useForm<RenterFormValues>>['formState']['errors'];
  t: Dictionary['renters']['dialog'];
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-fullName`}>
          {t.fullName} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-fullName`}
          placeholder={t.placeholderFullName}
          aria-invalid={!!errors.fullName}
          {...register('fullName')}
        />
        {errors.fullName && (
          <p className="text-xs text-destructive">{errors.fullName.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-email`}>
          {t.email}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-email`}
          type="email"
          placeholder={t.placeholderEmail}
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-phone`}>
          {t.phone}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-phone`}
          placeholder={t.placeholderPhone}
          {...register('phone')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-emergencyContactName`}>
          {t.emergencyContactName}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-emergencyContactName`}
          placeholder={t.placeholderEmergencyContactName}
          {...register('emergencyContactName')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-emergencyContactPhone`}>
          {t.emergencyContactPhone}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Input
          id={`${idPrefix}-emergencyContactPhone`}
          placeholder={t.placeholderEmergencyContactPhone}
          {...register('emergencyContactPhone')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>
          {t.notes}{' '}
          <span className="text-muted-foreground font-normal">
            {t.optional}
          </span>
        </Label>
        <Textarea
          id={`${idPrefix}-notes`}
          placeholder={t.placeholderNotes}
          rows={2}
          {...register('notes')}
        />
      </div>
    </>
  );
}
