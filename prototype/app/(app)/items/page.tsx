"use client";

import { useMemo, useState } from "react";
import {
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { computeMetrics } from "@/lib/metrics";
import type { Item, ItemType } from "@/lib/types";
import {
  formatCurrencyCents,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { ItemTypeBadge } from "@/components/app/badges";
import { EmptyState } from "@/components/app/empty-state";
import { ItemDialog } from "@/components/app/item-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Filter = "ALL" | ItemType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PRODUCT", label: "Products" },
  { value: "SERVICE", label: "Services" },
];

export default function ItemsPage() {
  const { orgData, isAdmin, dispatch } = useStore();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const metrics = useMemo(
    () => (orgData ? computeMetrics(orgData) : null),
    [orgData],
  );
  if (!orgData || !metrics) return null;

  const rows = metrics.itemMetrics.filter(
    (m) => filter === "ALL" || m.item.type === filter,
  );

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (item: Item) => {
    setEditing(item);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Items"
        description="The products and services your organization sells."
      >
        {isAdmin && (
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add item
          </Button>
        )}
      </PageHeader>

      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No items yet"
          description="Add the products and services you sell to start tracking margins."
          action={
            isAdmin ? (
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                Add item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Units sold</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.item.id}>
                  <TableCell className="font-medium text-foreground">
                    {m.item.name}
                  </TableCell>
                  <TableCell>
                    <ItemTypeBadge type={m.item.type} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrencyCents(m.item.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrencyCents(m.item.unitCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="font-medium text-foreground">
                      {formatCurrencyCents(m.contributionMarginUnit)}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {formatPercent(m.marginPct, 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(m.units)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(m.item)}>
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(m.item)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This removes the item from your catalog. This can't be undone in the prototype."
        onConfirm={() => {
          if (deleting) {
            dispatch({ type: "DELETE_ITEM", id: deleting.id });
          }
        }}
      />
    </div>
  );
}
