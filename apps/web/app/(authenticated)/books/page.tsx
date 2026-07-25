'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { BookOpen, Plus, Search, Pencil, Trash2 } from 'lucide-react';

import { bookCreateRequestSchema } from '@repo/contracts';
import type {
  BookConditionPriceInput,
  BookCopyCondition,
  BookCreateRequest,
  BookResponse,
} from '@repo/contracts';
import { CONDITION_ORDER, CONDITION_LABELS } from '@/lib/book-condition';
import { useBooks } from '@/hooks/use-books';
import { useAuthors } from '@/hooks/use-authors';
import { useCategories } from '@/hooks/use-categories';
import { usePublishers } from '@/hooks/use-publishers';
import { useDebounce } from '@/hooks/use-debounce';
import { useImageUpload } from '@/hooks/use-image-upload';
import { ApiError } from '@/lib/api';
import { RequireRole } from '@/components/require-role';
import { TablePagination } from '@/components/table-pagination';
import { MultiSelect } from '@/components/multi-select';
import { Combobox } from '@/components/combobox';
import { BookCover } from '@/components/book-cover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const PAGE_SIZE = 20;

// z.coerce.date() makes the schema's input type diverge from its output type,
// so the form is typed with the input while submit receives the parsed output.
type BookFormInput = z.input<typeof bookCreateRequestSchema>;

// Buy price per condition ('' = not for sale in that condition). Borrowing is
// free, so there's no rent price.
type PriceRows = Record<BookCopyCondition, string>;

function emptyPriceRows(): PriceRows {
  return Object.fromEntries(CONDITION_ORDER.map((c) => [c, ''])) as PriceRows;
}

// Starting stock per condition, create-only ('' = no copies to add right
// away). Ongoing stock changes go through the book detail page's copy
// management, which handles individual barcodes.
type QuantityRows = Record<BookCopyCondition, string>;

function emptyQuantityRows(): QuantityRows {
  return Object.fromEntries(
    CONDITION_ORDER.map((c) => [c, '']),
  ) as QuantityRows;
}

function toDateInput(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function BooksPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can manage the catalog."
    >
      <BooksManager />
    </RequireRole>
  );
}

function BooksManager() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookResponse | null>(null);
  const [deleting, setDeleting] = useState<BookResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { books, total, isLoading, error, create, update, remove } = useBooks({
    page,
    search: debouncedSearch,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (book: BookResponse) => {
    setEditing(book);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await remove(deleting.id);
      toast.success(`Deleted "${deleting.title}"`);
      setDeleting(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to delete book',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Books</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your library&apos;s catalog of titles
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or ISBN..."
              className="w-full pl-9 sm:w-64"
              aria-label="Search books by title or ISBN"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Book
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Books
            {total !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load books
            </div>
          ) : !books?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No books found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Authors</TableHead>
                    <TableHead>Publisher</TableHead>
                    <TableHead>ISBN</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books.map((book) => (
                    <TableRow
                      key={book.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/books/${book.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">
                        {book.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {book.authors.length
                          ? book.authors.map((a) => a.name).join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {book.publisher?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {book.isbn ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${book.title}`}
                            onClick={() => openEdit(book)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${book.title}`}
                            onClick={() => setDeleting(book)}
                          >
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={page}
                total={total ?? 0}
                limit={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <BookDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        book={editing}
        onCreate={create}
        onUpdate={update}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete book</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleting?.title}</strong>
              ? This cannot be undone.
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

interface BookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: BookResponse | null;
  onCreate: (body: BookCreateRequest) => Promise<unknown>;
  onUpdate: (id: string, body: BookCreateRequest) => Promise<unknown>;
}

function BookDialog({
  open,
  onOpenChange,
  book,
  onCreate,
  onUpdate,
}: BookDialogProps) {
  // Option lists for the publisher combobox + author/category multi-selects.
  const { authors, create: createAuthor } = useAuthors({
    limit: 1000,
    enabled: open,
  });
  const { categories, create: createCategory } = useCategories({
    limit: 1000,
    enabled: open,
  });
  const { publishers, create: createPublisher } = usePublishers({
    limit: 1000,
    enabled: open,
  });

  // Lets staff add a missing author/category/publisher without leaving the
  // book form - a name is all any of the three require to exist.
  const quickCreate = async (
    create: (body: { name: string }) => Promise<{ id: string; name: string }>,
    name: string,
    label: string,
  ) => {
    try {
      const created = await create({ name });
      return { value: created.id, label: created.name };
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : `Failed to create ${label}`,
      );
      throw err;
    }
  };

  const form = useForm<BookFormInput, unknown, BookCreateRequest>({
    resolver: zodResolver(bookCreateRequestSchema),
    defaultValues: { title: '', authorIds: [], categoryIds: [] },
  });

  const { upload, isUploading } = useImageUpload();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await upload(file);
      form.setValue('coverUrl', url, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to upload cover image',
      );
    }
  };

  // BookCopyCondition is a fixed, closed 5-value enum, so a static
  // one-row-per-condition grid (rather than a dynamic add/remove list) can't
  // produce duplicate or invalid rows - simpler than useFieldArray for this.
  const [priceRows, setPriceRows] = useState<PriceRows>(emptyPriceRows);
  const [quantityRows, setQuantityRows] =
    useState<QuantityRows>(emptyQuantityRows);

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: book?.title ?? '',
      isbn: book?.isbn ?? undefined,
      description: book?.description ?? undefined,
      publishedDate: book?.publishedDate
        ? new Date(book.publishedDate)
        : undefined,
      language: book?.language ?? undefined,
      pageCount: book?.pageCount ?? undefined,
      coverUrl: book?.coverUrl ?? undefined,
      edition: book?.edition ?? undefined,
      publisherId: book?.publisher?.id ?? undefined,
      authorIds: book?.authors.map((a) => a.id) ?? [],
      categoryIds: book?.categories.map((c) => c.id) ?? [],
    });

    const rows = emptyPriceRows();
    for (const cp of book?.conditionPrices ?? []) {
      rows[cp.condition] = cp.buyPrice;
    }
    setPriceRows(rows);
    // Always blank - this input means "add N more copies", never "set stock
    // to N", so it starts empty even when editing a book that already has
    // copies.
    setQuantityRows(emptyQuantityRows());
  }, [open, book, form]);

  const onSubmit = async (values: BookCreateRequest) => {
    const conditionPrices: BookConditionPriceInput[] = CONDITION_ORDER.filter(
      (condition) => priceRows[condition].trim() !== '',
    ).map((condition) => ({
      condition,
      buyPrice: priceRows[condition].trim(),
    }));

    const addCopies = CONDITION_ORDER.filter(
      (condition) => quantityRows[condition].trim() !== '',
    ).map((condition) => ({
      condition,
      quantity: Number(quantityRows[condition]),
    }));

    if (
      addCopies.some(
        (row) => !Number.isInteger(row.quantity) || row.quantity < 1,
      )
    ) {
      toast.error('Stock to add must be a whole number of 1 or more');
      return;
    }

    const payload: BookCreateRequest = {
      title: values.title.trim(),
      isbn: values.isbn?.trim() || undefined,
      description: values.description?.trim() || undefined,
      publishedDate: values.publishedDate,
      language: values.language?.trim() || undefined,
      pageCount: values.pageCount,
      coverUrl: values.coverUrl?.trim() || undefined,
      conditionPrices,
      edition: values.edition?.trim() || undefined,
      publisherId: values.publisherId || undefined,
      // Always send the arrays so associations are replaced on edit.
      authorIds: values.authorIds ?? [],
      categoryIds: values.categoryIds ?? [],
      ...(addCopies.length ? { addCopies } : {}),
    };

    try {
      if (book) {
        await onUpdate(book.id, payload);
        toast.success('Book updated');
      } else {
        await onCreate(payload);
        toast.success('Book created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save book',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{book ? 'Edit book' : 'New book'}</DialogTitle>
          <DialogDescription>
            {book
              ? "Update this book's details and associations."
              : 'Add a new title to your catalog.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Pride and Prejudice" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isbn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ISBN</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="978-…"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="edition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edition</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="1st"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="publisherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publisher</FormLabel>
                  <Combobox
                    options={(publishers ?? []).map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    value={field.value ?? null}
                    onChange={(value) => field.onChange(value ?? undefined)}
                    onCreate={(name) =>
                      quickCreate(createPublisher, name, 'publisher')
                    }
                    clearable
                    placeholder="Select a publisher"
                    searchPlaceholder="Search publishers…"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authorIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authors</FormLabel>
                  <MultiSelect
                    options={(authors ?? []).map((a) => ({
                      value: a.id,
                      label: a.name,
                    }))}
                    selected={field.value ?? []}
                    onChange={field.onChange}
                    onCreate={(name) =>
                      quickCreate(createAuthor, name, 'author')
                    }
                    placeholder="Select authors…"
                    searchPlaceholder="Search authors…"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <MultiSelect
                    options={(categories ?? []).map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    selected={field.value ?? []}
                    onChange={field.onChange}
                    onCreate={(name) =>
                      quickCreate(createCategory, name, 'category')
                    }
                    placeholder="Select categories…"
                    searchPlaceholder="Search categories…"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="publishedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Published date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={toDateInput(field.value)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="English"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="pageCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="320"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Sale price by condition</FormLabel>
              <p className="text-sm text-muted-foreground">
                Set a buy price for each condition you sell this book in. Leave
                blank if it isn&apos;t for sale in that condition. Borrowing is
                free — patrons only pay overdue or lost fines.{' '}
                {book
                  ? 'Add stock to create more copies (auto-barcoded) - this never removes existing copies; manage those individually from this book’s detail page.'
                  : 'Optionally add starting stock - copies get auto-generated barcodes; edit them anytime from the book’s detail page.'}
              </p>
              <div className="space-y-2 rounded-md border border-border p-3">
                <div className="grid grid-cols-3 gap-3 px-0.5">
                  <span />
                  <span className="text-xs font-medium text-muted-foreground">
                    Buy price
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {book ? 'Add stock' : 'Starting stock'}
                  </span>
                </div>
                {CONDITION_ORDER.map((condition) => (
                  <div
                    key={condition}
                    className="grid grid-cols-3 items-center gap-3"
                  >
                    <span className="text-sm text-foreground">
                      {CONDITION_LABELS[condition]}
                    </span>
                    <Input
                      placeholder="Buy price"
                      aria-label={`${CONDITION_LABELS[condition]} buy price`}
                      value={priceRows[condition]}
                      onChange={(e) =>
                        setPriceRows((prev) => ({
                          ...prev,
                          [condition]: e.target.value,
                        }))
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder={book ? 'Add qty' : 'Quantity'}
                      aria-label={`${CONDITION_LABELS[condition]} ${book ? 'add stock' : 'starting stock'}`}
                      value={quantityRows[condition]}
                      onChange={(e) =>
                        setQuantityRows((prev) => ({
                          ...prev,
                          [condition]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </FormItem>
            <FormField
              control={form.control}
              name="coverUrl"
              render={() => {
                const coverUrl = form.watch('coverUrl');
                return (
                  <FormItem>
                    <FormLabel>Cover image</FormLabel>
                    <div className="flex items-start gap-4">
                      <BookCover
                        coverUrl={coverUrl ?? null}
                        title={form.watch('title') || 'Cover preview'}
                        className="aspect-2/3 w-24 rounded-md"
                      />
                      <div className="flex flex-col gap-2">
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverFileChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => coverInputRef.current?.click()}
                        >
                          {isUploading
                            ? 'Uploading...'
                            : coverUrl
                              ? 'Replace image'
                              : 'Upload image'}
                        </Button>
                        {coverUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              form.setValue('coverUrl', undefined, {
                                shouldDirty: true,
                              })
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short synopsis…"
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
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
                  : book
                    ? 'Save changes'
                    : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
