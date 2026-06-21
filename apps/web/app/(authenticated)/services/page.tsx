'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useServices } from '@/hooks/use-services';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Briefcase, Search, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  serviceCreateRequestSchema,
  type ServiceCreateRequest,
  type ServiceResponse,
} from '@repo/contracts';

function formatUSD(value: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(value));
}

interface ServiceFormProps {
  defaultValues?: Partial<ServiceCreateRequest>;
  onSubmit: (data: ServiceCreateRequest) => Promise<void>;
}

function ServiceForm({ defaultValues, onSubmit }: ServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServiceCreateRequest>({
    resolver: zodResolver(serviceCreateRequestSchema),
    defaultValues: { isActive: true, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Service Name *</Label>
        <Input id="name" placeholder="e.g. Consulting Support" {...register('name')} />
        {errors.name && (
          <p className="text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Optional description"
          {...register('description')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="unitPrice">Unit Price (USD) *</Label>
          <Input id="unitPrice" placeholder="0.00" {...register('unitPrice')} />
          {errors.unitPrice && (
            <p className="text-xs text-red-500">{errors.unitPrice.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="unitCost">Unit Cost (USD)</Label>
          <Input id="unitCost" placeholder="0.00" {...register('unitCost')} />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" placeholder="Optional SKU" {...register('sku')} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving…' : 'Save Service'}
      </Button>
    </form>
  );
}

export default function ServicesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { services, meta, isLoading, createService, updateService, deleteService } =
    useServices();

  const filteredServices = services?.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const handleCreate = async (data: ServiceCreateRequest) => {
    try {
      await createService(data);
      toast.success('Service created');
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create service',
      );
    }
  };

  const handleUpdate = async (data: ServiceCreateRequest) => {
    if (!editing) return;
    try {
      await updateService(editing.id, data);
      toast.success('Service updated');
      setEditing(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update service',
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteService(deleteTarget);
      toast.success('Service deleted');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete service',
      );
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta?.total ?? 0} services
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Service</DialogTitle>
            </DialogHeader>
            <ServiceForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search services by name, description, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !filteredServices.length ? (
            <div className="p-12 text-center">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {services?.length ? 'No services match your search.' : 'No services yet.'}
              </p>
              <Button
                variant="link"
                className="mt-2 text-primary"
                onClick={() => setOpen(true)}
              >
                Add your first service
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredServices.map((service) => {
                const margin =
                  service.unitCost
                    ? (
                        ((parseFloat(service.unitPrice) -
                          parseFloat(service.unitCost)) /
                          parseFloat(service.unitPrice)) *
                        100
                      ).toFixed(1)
                    : null;

                return (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {service.name}
                        </p>
                        {!service.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {service.sku && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {service.sku}
                          </Badge>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-xs text-muted-foreground">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatUSD(service.unitPrice)}
                        </p>
                        {service.unitCost && (
                          <p className="text-xs text-muted-foreground">
                            Cost: {formatUSD(service.unitCost)}
                            {margin && (
                              <span className="ml-1 text-[#34D39A]">
                                ({margin}% margin)
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(service)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(service.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          {editing && (
            <ServiceForm
              defaultValues={{
                name: editing.name,
                description: editing.description ?? undefined,
                unitPrice: editing.unitPrice,
                unitCost: editing.unitCost ?? undefined,
                sku: editing.sku ?? undefined,
                isActive: editing.isActive,
              }}
              onSubmit={handleUpdate}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete service?"
        description="This service will be permanently removed. This action cannot be undone."
        confirmLabel="Yes, delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
