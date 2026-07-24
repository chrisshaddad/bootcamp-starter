'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Library } from 'lucide-react';

import { bookCopyCreateRequestSchema } from '@repo/contracts';
import type {
  BookCopyResponse,
  BookCopyStatus,
  BookCopyCondition,
} from '@repo/contracts';
import { useBook } from '@/hooks/use-books';
import { useBookCopies } from '@/hooks/use-book-copies';
import { ApiError } from '@/lib/api';
import { CONDITION_ORDER, CONDITION_LABELS } from '@/lib/book-condition';
import { RequireRole } from '@/components/require-role';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const STATUS_OPTIONS: BookCopyStatus[] = [
  'AVAILABLE',
  'ON_LOAN',
  'RESERVED',
  'LOST',
  'MAINTENANCE',
];
const CONDITION_OPTIONS: BookCopyCondition[] = [
  'NEW',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
];

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  ON_LOAN: 'On loan',
  RESERVED: 'Reserved',
  LOST: 'Lost',
  MAINTENANCE: 'Maintenance',
};
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-success-light text-success-dark',
  ON_LOAN: 'bg-library-accent-100 text-library-accent-800',
  RESERVED: 'bg-warning-light text-warning-dark',
  LOST: 'bg-error-light text-error',
  MAINTENANCE: 'bg-muted text-muted-foreground',
};

// A copy's editable fields (bookId is fixed after creation).
const copyFormSchema = bookCopyCreateRequestSchema.omit({ bookId: true });
// z.coerce.date() (acquiredAt) diverges input from output — see books/page.tsx.
type CopyFormInput = z.input<typeof copyFormSchema>;
type CopyFormValues = z.infer<typeof copyFormSchema>;

function toDateInput(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function BookDetailPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can manage the catalog."
    >
      <BookDetail />
    </RequireRole>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="wrap-break-word text-right text-sm font-medium text-foreground">
        {value || '—'}
      </span>
    </div>
  );
}

function BookDetail() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const { book, isLoading: bookLoading, error: bookError } = useBook(bookId);
  const {
    bookCopies,
    total,
    isLoading: copiesLoading,
    error: copiesError,
    create,
    update,
    remove,
  } = useBookCopies({ bookId, limit: 100 });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookCopyResponse | null>(null);
  const [deleting, setDeleting] = useState<BookCopyResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (copy: BookCopyResponse) => {
    setEditing(copy);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await remove(deleting.id);
      toast.success(`Deleted copy "${deleting.barcode}"`);
      setDeleting(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to delete copy',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (bookLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (bookError || !book) {
    return (
      <div className="space-y-4">
        <div className="py-10 text-center text-error">
          {bookError ? 'Failed to load book' : 'Book not found'}
        </div>
        <div className="text-center">
          <Button variant="outline" onClick={() => router.push('/books')}>
            <ArrowLeft className="h-4 w-4" />
            Back to books
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          onClick={() => router.push('/books')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to books
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{book.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {book.authors.length
            ? book.authors.map((a) => a.name).join(', ')
            : 'No authors'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="ISBN" value={book.isbn} />
          <InfoRow label="Publisher" value={book.publisher?.name} />
          <InfoRow
            label="Categories"
            value={book.categories.map((c) => c.name).join(', ')}
          />
          <InfoRow label="Edition" value={book.edition} />
          <InfoRow label="Language" value={book.language} />
          <InfoRow label="Pages" value={book.pageCount} />
          <InfoRow
            label="Published"
            value={
              book.publishedDate
                ? new Date(book.publishedDate).toLocaleDateString()
                : undefined
            }
          />
          {book.description && (
            <div className="pt-3">
              <p className="text-sm text-muted-foreground">
                {book.description}
              </p>
            </div>
          )}
          <div className="pt-3">
            <span className="text-sm text-muted-foreground">Pricing</span>
            {book.conditionPrices.length === 0 ? (
              <p className="mt-1 text-sm font-medium text-foreground">
                Not priced
              </p>
            ) : (
              <div className="mt-1 space-y-1">
                {[...book.conditionPrices]
                  .sort(
                    (a, b) =>
                      CONDITION_ORDER.indexOf(a.condition) -
                      CONDITION_ORDER.indexOf(b.condition),
                  )
                  .map((cp) => (
                    <div
                      key={cp.id}
                      className="flex justify-between text-sm text-foreground"
                    >
                      <span>{CONDITION_LABELS[cp.condition]}</span>
                      <span>Buy ${cp.buyPrice}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Copies
            {total !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Copy
          </Button>
        </CardHeader>
        <CardContent>
          {copiesLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : copiesError ? (
            <div className="py-8 text-center text-error">
              Failed to load copies
            </div>
          ) : !bookCopies?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No copies yet. Add one to start lending this title.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Acquired</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookCopies.map((copy) => (
                  <TableRow key={copy.id}>
                    <TableCell className="font-medium text-foreground">
                      {copy.barcode}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={copy.status}
                        labels={STATUS_LABELS}
                        colors={STATUS_COLORS}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {copy.condition}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {copy.acquiredAt
                        ? new Date(copy.acquiredAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit copy ${copy.barcode}`}
                          onClick={() => openEdit(copy)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete copy ${copy.barcode}`}
                          onClick={() => setDeleting(copy)}
                        >
                          <Trash2 className="h-4 w-4 text-error" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CopyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        copy={editing}
        onCreate={(values) => create({ ...values, bookId })}
        onUpdate={update}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete copy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete copy{' '}
              <strong>{deleting?.barcode}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: BookCopyResponse | null;
  onCreate: (values: CopyFormValues) => Promise<unknown>;
  onUpdate: (id: string, values: CopyFormValues) => Promise<unknown>;
}

function CopyDialog({
  open,
  onOpenChange,
  copy,
  onCreate,
  onUpdate,
}: CopyDialogProps) {
  const form = useForm<CopyFormInput, unknown, CopyFormValues>({
    resolver: zodResolver(copyFormSchema),
    defaultValues: { barcode: '', status: 'AVAILABLE', condition: 'GOOD' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      barcode: copy?.barcode ?? '',
      status: copy?.status ?? 'AVAILABLE',
      condition: copy?.condition ?? 'GOOD',
      acquiredAt: copy?.acquiredAt ? new Date(copy.acquiredAt) : undefined,
    });
  }, [open, copy, form]);

  const onSubmit = async (values: CopyFormValues) => {
    const payload: CopyFormValues = {
      barcode: values.barcode.trim(),
      status: values.status,
      condition: values.condition,
      acquiredAt: values.acquiredAt,
    };

    try {
      if (copy) {
        await onUpdate(copy.id, payload);
        toast.success('Copy updated');
      } else {
        await onCreate(payload);
        toast.success('Copy added');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save copy',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy ? 'Edit copy' : 'Add copy'}</DialogTitle>
          <DialogDescription>
            {copy
              ? "Update this copy's details."
              : 'Add a physical copy to this title.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode</FormLabel>
                  <FormControl>
                    <Input placeholder="LIB-000123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value ?? 'AVAILABLE'}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select
                      value={field.value ?? 'GOOD'}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONDITION_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="acquiredAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acquired date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={toDateInput(field.value)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? new Date(e.target.value) : undefined,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Saving...'
                  : copy
                    ? 'Save changes'
                    : 'Add copy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
