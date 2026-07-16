'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Feather, Plus, Search, Pencil, Trash2 } from 'lucide-react';

import { authorCreateRequestSchema } from '@repo/contracts';
import type { AuthorCreateRequest, AuthorResponse } from '@repo/contracts';
import { useAuthors } from '@/hooks/use-authors';
import { useDebounce } from '@/hooks/use-debounce';
import { ApiError } from '@/lib/api';
import { RequireRole } from '@/components/require-role';
import { TablePagination } from '@/components/table-pagination';
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

export default function AuthorsPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can manage the catalog."
    >
      <AuthorsManager />
    </RequireRole>
  );
}

function AuthorsManager() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AuthorResponse | null>(null);
  const [deleting, setDeleting] = useState<AuthorResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { authors, total, isLoading, error, create, update, remove } =
    useAuthors({ page, search: debouncedSearch, limit: PAGE_SIZE });

  // Reset to the first page whenever the search term changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (author: AuthorResponse) => {
    setEditing(author);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await remove(deleting.id);
      toast.success(`Deleted "${deleting.name}"`);
      setDeleting(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to delete author',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Authors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the authors in your library&apos;s catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-56 pl-9"
              aria-label="Search authors by name"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Author
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Feather className="h-5 w-5" />
            Authors
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
              Failed to load authors
            </div>
          ) : !authors?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No authors found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Birth year</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authors.map((author) => (
                    <TableRow key={author.id}>
                      <TableCell className="font-medium text-foreground">
                        {author.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {author.nationality ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {author.birthYear ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${author.name}`}
                            onClick={() => openEdit(author)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${author.name}`}
                            onClick={() => setDeleting(author)}
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

      <AuthorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        author={editing}
        onCreate={create}
        onUpdate={update}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete author</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleting?.name}</strong>?
              This cannot be undone.
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

interface AuthorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author: AuthorResponse | null;
  onCreate: (body: AuthorCreateRequest) => Promise<unknown>;
  onUpdate: (id: string, body: AuthorCreateRequest) => Promise<unknown>;
}

function AuthorDialog({
  open,
  onOpenChange,
  author,
  onCreate,
  onUpdate,
}: AuthorDialogProps) {
  const form = useForm<AuthorCreateRequest>({
    resolver: zodResolver(authorCreateRequestSchema),
    defaultValues: {
      name: '',
      bio: '',
      nationality: '',
      photoUrl: '',
    },
  });

  // Populate (edit) or clear (create) the form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    form.reset({
      name: author?.name ?? '',
      bio: author?.bio ?? '',
      nationality: author?.nationality ?? '',
      birthYear: author?.birthYear ?? undefined,
      photoUrl: author?.photoUrl ?? '',
    });
  }, [open, author, form]);

  const onSubmit = async (values: AuthorCreateRequest) => {
    // Drop blank optionals so we don't persist empty strings.
    const payload: AuthorCreateRequest = {
      name: values.name.trim(),
      bio: values.bio?.trim() || undefined,
      nationality: values.nationality?.trim() || undefined,
      birthYear: values.birthYear,
      photoUrl: values.photoUrl?.trim() || undefined,
    };

    try {
      if (author) {
        await onUpdate(author.id, payload);
        toast.success('Author updated');
      } else {
        await onCreate(payload);
        toast.success('Author created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save author',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{author ? 'Edit author' : 'New author'}</DialogTitle>
          <DialogDescription>
            {author
              ? "Update this author's details."
              : 'Add a new author to your catalog.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Austen" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="British"
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
                name="birthYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1775"
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
            </div>
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://…"
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
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short biography…"
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
                  : author
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
