'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Tags, Plus, Search, Pencil, Trash2 } from 'lucide-react';

import { categoryCreateRequestSchema } from '@repo/contracts';
import type { CategoryCreateRequest, CategoryResponse } from '@repo/contracts';
import { useCategories } from '@/hooks/use-categories';
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

export default function CategoriesPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can manage the catalog."
    >
      <CategoriesManager />
    </RequireRole>
  );
}

function CategoriesManager() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [deleting, setDeleting] = useState<CategoryResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { categories, total, isLoading, error, create, update, remove } =
    useCategories({ page, search: debouncedSearch, limit: PAGE_SIZE });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (category: CategoryResponse) => {
    setEditing(category);
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
        err instanceof ApiError ? err.message : 'Failed to delete category',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize your catalog into browsable categories
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
              aria-label="Search categories by name"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Categories
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
              Failed to load categories
            </div>
          ) : !categories?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No categories found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium text-foreground">
                        {category.name}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {category.description ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${category.name}`}
                            onClick={() => openEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${category.name}`}
                            onClick={() => setDeleting(category)}
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

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
        onCreate={create}
        onUpdate={update}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
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

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryResponse | null;
  onCreate: (body: CategoryCreateRequest) => Promise<unknown>;
  onUpdate: (id: string, body: CategoryCreateRequest) => Promise<unknown>;
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
  onCreate,
  onUpdate,
}: CategoryDialogProps) {
  const form = useForm<CategoryCreateRequest>({
    resolver: zodResolver(categoryCreateRequestSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: category?.name ?? '',
      description: category?.description ?? '',
    });
  }, [open, category, form]);

  const onSubmit = async (values: CategoryCreateRequest) => {
    const payload: CategoryCreateRequest = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    };

    try {
      if (category) {
        await onUpdate(category.id, payload);
        toast.success('Category updated');
      } else {
        await onCreate(payload);
        toast.success('Category created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save category',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit category' : 'New category'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Update this category's details."
              : 'Add a new category to your catalog.'}
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
                    <Input placeholder="Fiction" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description…"
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
                  : category
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
