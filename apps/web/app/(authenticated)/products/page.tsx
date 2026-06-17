'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Plus, Trash2, Pencil, Package } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  productCreateRequestSchema,
  type ProductCreateRequest,
  type ProductResponse,
} from '@repo/contracts';

function formatUSD(value: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(value));
}

interface ProductFormProps {
  defaultValues?: Partial<ProductCreateRequest>;
  onSubmit: (data: ProductCreateRequest) => Promise<void>;
}

function ProductForm({ defaultValues, onSubmit }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductCreateRequest>({
    resolver: zodResolver(productCreateRequestSchema),
    defaultValues: { isActive: true, ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Product Name *</Label>
        <Input id="name" placeholder="e.g. Premium Widget" {...register('name')} />
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
        {isSubmitting ? 'Saving…' : 'Save Product'}
      </Button>
    </form>
  );
}

export default function ProductsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { products, meta, isLoading, createProduct, updateProduct, deleteProduct } =
    useProducts();

  const handleCreate = async (data: ProductCreateRequest) => {
    try {
      await createProduct(data);
      toast.success('Product created');
      setOpen(false);
    } catch {
      toast.error('Failed to create product');
    }
  };

  const handleUpdate = async (data: ProductCreateRequest) => {
    if (!editing) return;
    try {
      await updateProduct(editing.id, data);
      toast.success('Product updated');
      setEditing(null);
    } catch {
      toast.error('Failed to update product');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget);
      toast.success('Product deleted');
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta?.total ?? 0} products
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Product</DialogTitle>
            </DialogHeader>
            <ProductForm onSubmit={handleCreate} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !products?.length ? (
            <div className="p-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No products yet.</p>
              <Button
                variant="link"
                className="mt-2 text-primary"
                onClick={() => setOpen(true)}
              >
                Add your first product
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {products.map((product) => {
                const margin =
                  product.unitCost
                    ? (
                        ((parseFloat(product.unitPrice) -
                          parseFloat(product.unitCost)) /
                          parseFloat(product.unitPrice)) *
                        100
                      ).toFixed(1)
                    : null;

                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {product.name}
                        </p>
                        {!product.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {product.sku && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {product.sku}
                          </Badge>
                        )}
                      </div>
                      {product.description && (
                        <p className="text-xs text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatUSD(product.unitPrice)}
                        </p>
                        {product.unitCost && (
                          <p className="text-xs text-muted-foreground">
                            Cost: {formatUSD(product.unitCost)}
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
                        onClick={() => setEditing(product)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(product.id)}
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
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editing && (
            <ProductForm
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
        title="Delete product?"
        description="This product will be permanently removed. This action cannot be undone."
        confirmLabel="Yes, delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
