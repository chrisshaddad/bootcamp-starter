'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSales } from '@/hooks/use-sales';
import { useProducts } from '@/hooks/use-products';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  saleCreateRequestSchema,
  type SaleCreateRequest,
  type SaleResponse,
} from '@repo/contracts';
import { cn } from '@/lib/utils';

function formatUSD(value: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(value));
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

interface SaleFormProps {
  defaultValues?: Partial<SaleCreateRequest>;
  onSubmit: (data: SaleCreateRequest) => Promise<void>;
  products: Array<{ id: string; name: string }>;
}

function SaleForm({ defaultValues, onSubmit, products }: SaleFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaleCreateRequest>({
    resolver: zodResolver(saleCreateRequestSchema),
    defaultValues: {
      date: today(),
      quantity: '1',
      recurrence: 'NONE',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label>Product (optional)</Label>
        <Select
          onValueChange={(v) =>
            setValue('productId', v === 'none' ? undefined : v)
          }
          defaultValue={defaultValues?.productId ?? 'none'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Direct sale —</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" placeholder="1" {...register('quantity')} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="unitCost">Unit Cost (USD)</Label>
          <Input id="unitCost" placeholder="0.00" {...register('unitCost')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date">Date *</Label>
          <Input id="date" type="date" {...register('date')} />
          {errors.date && (
            <p className="text-xs text-red-500">{errors.date.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Recurrence</Label>
        <Select
          onValueChange={(v) =>
            setValue('recurrence', v as SaleCreateRequest['recurrence'])
          }
          defaultValue={defaultValues?.recurrence ?? 'NONE'}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((r) => (
              <SelectItem key={r} value={r}>
                {r === 'NONE' ? 'One-time' : r.charAt(0) + r.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Saving…' : 'Save Sale'}
      </Button>
    </form>
  );
}

export default function SalesPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SaleResponse | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { sales, meta, isLoading, createSale, updateSale, deleteSale } =
    useSales({ search: search || undefined });
  const { products } = useProducts({ activeOnly: true });

  const handleCreate = async (data: SaleCreateRequest) => {
    try {
      await createSale(data);
      toast.success('Sale recorded');
      setOpen(false);
    } catch {
      toast.error('Failed to record sale');
    }
  };

  const handleUpdate = async (data: SaleCreateRequest) => {
    if (!editing) return;
    try {
      await updateSale(editing.id, data);
      toast.success('Sale updated');
      setEditing(null);
    } catch {
      toast.error('Failed to update sale');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSale(deleteTarget);
      toast.success('Sale deleted');
    } catch {
      toast.error('Failed to delete sale');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta?.total ?? 0} total records
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Record Sale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Sale</DialogTitle>
            </DialogHeader>
            <SaleForm
              onSubmit={handleCreate}
              products={products ?? []}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search sales…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : !sales?.length ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
              <Button
                variant="link"
                className="mt-2 text-primary"
                onClick={() => setOpen(true)}
              >
                Record your first sale
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sales.map((sale) => {
                const grossProfit = sale.grossProfit
                  ? parseFloat(sale.grossProfit)
                  : null;
                return (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {sale.product?.name ?? sale.description ?? 'Direct sale'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{sale.date}</span>
                        <span>·</span>
                        <span>
                          {sale.quantity} × {formatUSD(sale.unitPrice)}
                        </span>
                        {grossProfit !== null && (
                          <>
                            <span>·</span>
                            <span
                              className={cn(
                                'font-medium',
                                grossProfit >= 0
                                  ? 'text-[#34D39A]'
                                  : 'text-destructive',
                              )}
                            >
                              GP: {formatUSD(sale.grossProfit!)}
                            </span>
                          </>
                        )}
                        {sale.recurrence !== 'NONE' && (
                          <Badge variant="outline" className="text-xs">
                            {sale.recurrence.toLowerCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {formatUSD(sale.revenue ?? sale.unitPrice)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(sale)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(sale.id)}
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
            <DialogTitle>Edit Sale</DialogTitle>
          </DialogHeader>
          {editing && (
            <SaleForm
              defaultValues={{
                productId: editing.productId ?? undefined,
                description: editing.description ?? undefined,
                quantity: editing.quantity,
                unitPrice: editing.unitPrice,
                unitCost: editing.unitCost ?? undefined,
                date: editing.date,
                recurrence: editing.recurrence,
              }}
              onSubmit={handleUpdate}
              products={products ?? []}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete sale?"
        description="This sale record will be permanently removed. This action cannot be undone."
        confirmLabel="Yes, delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
