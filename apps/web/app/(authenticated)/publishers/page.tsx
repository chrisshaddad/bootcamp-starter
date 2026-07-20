'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building, Plus, Search, Pencil, Trash2 } from 'lucide-react';

import { publisherCreateRequestSchema } from '@repo/contracts';
import type {
  PublisherCreateRequest,
  PublisherResponse,
} from '@repo/contracts';
import { usePublishers } from '@/hooks/use-publishers';
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

export default function PublishersPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can manage the catalog."
    >
      <PublishersManager />
    </RequireRole>
  );
}

function PublishersManager() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PublisherResponse | null>(null);
  const [deleting, setDeleting] = useState<PublisherResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { publishers, total, isLoading, error, create, update, remove } =
    usePublishers({ page, search: debouncedSearch, limit: PAGE_SIZE });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (publisher: PublisherResponse) => {
    setEditing(publisher);
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
        err instanceof ApiError ? err.message : 'Failed to delete publisher',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Publishers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the publishers in your library&apos;s catalog
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full pl-9 sm:w-56"
              aria-label="Search publishers by name"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Publisher
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Publishers
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
              Failed to load publishers
            </div>
          ) : !publishers?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No publishers found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {publishers.map((publisher) => (
                    <TableRow key={publisher.id}>
                      <TableCell className="font-medium text-foreground">
                        {publisher.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {publisher.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {publisher.website ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${publisher.name}`}
                            onClick={() => openEdit(publisher)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${publisher.name}`}
                            onClick={() => setDeleting(publisher)}
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

      <PublisherDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        publisher={editing}
        onCreate={create}
        onUpdate={update}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete publisher</DialogTitle>
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

interface PublisherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publisher: PublisherResponse | null;
  onCreate: (body: PublisherCreateRequest) => Promise<unknown>;
  onUpdate: (id: string, body: PublisherCreateRequest) => Promise<unknown>;
}

function PublisherDialog({
  open,
  onOpenChange,
  publisher,
  onCreate,
  onUpdate,
}: PublisherDialogProps) {
  const form = useForm<PublisherCreateRequest>({
    resolver: zodResolver(publisherCreateRequestSchema),
    defaultValues: { name: '', website: '', address: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: publisher?.name ?? '',
      email: publisher?.email ?? undefined,
      website: publisher?.website ?? '',
      address: publisher?.address ?? '',
    });
  }, [open, publisher, form]);

  const onSubmit = async (values: PublisherCreateRequest) => {
    const payload: PublisherCreateRequest = {
      name: values.name.trim(),
      email: values.email?.trim() || undefined,
      website: values.website?.trim() || undefined,
      address: values.address?.trim() || undefined,
    };

    try {
      if (publisher) {
        await onUpdate(publisher.id, payload);
        toast.success('Publisher updated');
      } else {
        await onCreate(payload);
        toast.success('Publisher created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save publisher',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {publisher ? 'Edit publisher' : 'New publisher'}
          </DialogTitle>
          <DialogDescription>
            {publisher
              ? "Update this publisher's details."
              : 'Add a new publisher to your catalog.'}
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
                    <Input placeholder="Penguin Random House" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@publisher.com"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(e.target.value || undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
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
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional address…"
                      rows={2}
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
                  : publisher
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
