"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Tags,
  Trash2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { ExpenseCategory } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { CategoryDialog } from "@/components/app/category-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Badge } from "@/components/ui/badge";
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

export default function CategoriesPage() {
  const { orgData, isAdmin, dispatch } = useStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [deleting, setDeleting] = useState<ExpenseCategory | null>(null);

  const rows = useMemo(() => {
    if (!orgData) return [];
    return orgData.categories
      .map((cat) => {
        const exps = orgData.expenses.filter((e) => e.categoryId === cat.id);
        return {
          cat,
          count: exps.length,
          total: exps.reduce((s, e) => s + e.amount, 0),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [orgData]);

  if (!orgData) return null;

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const deletingCount = deleting
    ? orgData.expenses.filter((e) => e.categoryId === deleting.id).length
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense categories"
        description="Buckets that group your expenses for reporting."
      >
        <Button variant="outline" render={<Link href="/expenses" />}>
          <Receipt className="size-4" />
          Expenses
        </Button>
        {isAdmin && (
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add category
          </Button>
        )}
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Create categories like Rent or Marketing to organize your expenses."
          action={
            isAdmin ? (
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                Add category
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Category</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Total spent</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ cat, count, total }) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-3 rounded-full"
                        style={{ background: cat.color }}
                      />
                      <span className="font-medium text-foreground">
                        {cat.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {cat.recurring ? (
                      <Badge
                        variant="outline"
                        className="border-primary-base/30 text-primary-300"
                      >
                        Recurring
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Variable
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatNumber(count)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-foreground">
                    {formatCurrency(total)}
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
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(cat);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(cat)}
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

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description={
          deletingCount > 0
            ? `This will also remove ${deletingCount} expense${deletingCount === 1 ? "" : "s"} in this category.`
            : "This category has no expenses."
        }
        onConfirm={() => {
          if (deleting) dispatch({ type: "DELETE_CATEGORY", id: deleting.id });
        }}
      />
    </div>
  );
}
