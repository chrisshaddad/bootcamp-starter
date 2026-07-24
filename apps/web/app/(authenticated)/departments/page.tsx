'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { DepartmentResponse } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { useDepartments, useDepartmentMutations } from '@/hooks/use-departments';
import { ForbiddenPage } from '@/components/forbidden-page';
import { DepartmentFormDialog } from '@/components/department-form-dialog';
import { Button } from '@/components/ui/button';
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

export default function DepartmentsPage() {
  const { user } = useUser();
  const isOrgAdmin = user?.role === 'ORG_ADMIN';

  const { departments, isLoading, error } = useDepartments({
    enabled: isOrgAdmin,
  });
  const { deleteDepartment } = useDepartmentMutations();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editing, setEditing] = useState<DepartmentResponse | null>(null);
  const [deleting, setDeleting] = useState<DepartmentResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOrgAdmin) {
    return <ForbiddenPage message="Only org admins can manage departments." />;
  }

  const handleDelete = async () => {
    if (!deleting) return;
    setIsProcessing(true);
    try {
      await deleteDepartment(deleting.id);
      toast.success('Department deleted');
      setDeleting(null);
    } catch {
      toast.error('Failed to delete department');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize your organization into departments
          </p>
        </div>
        <Button
          className="gap-2 bg-primary-base hover:bg-primary-base/90"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Departments
            {departments !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({departments.length} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-destructive">
              Failed to load departments
            </div>
          ) : !departments?.length ? (
            <div className="py-10 text-center text-gray-500">
              No departments yet. Add your first one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium text-gray-900">
                      {dept.name}
                    </TableCell>
                    <TableCell className="max-w-md text-gray-600">
                      {dept.description ? (
                        <span className="line-clamp-1">{dept.description}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {dept.manager?.name ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditing(dept)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive/80"
                          onClick={() => setDeleting(dept)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
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

      <DepartmentFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <DepartmentFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        department={editing ?? undefined}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleting?.name}</strong>? This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
