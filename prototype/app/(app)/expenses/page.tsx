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
import type { Expense } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { RecurrenceBadge } from "@/components/app/badges";
import { ExpenseDialog } from "@/components/app/expense-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormSelect } from "@/components/app/form-select";
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

export default function ExpensesPage() {
  const { orgData, isAdmin, dispatch } = useStore();
  const [filter, setFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const categoryMap = useMemo(
    () => new Map((orgData?.categories ?? []).map((c) => [c.id, c])),
    [orgData],
  );

  const rows = useMemo(() => {
    if (!orgData) return [];
    return orgData.expenses
      .filter((e) => filter === "ALL" || e.categoryId === filter)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [orgData, filter]);

  if (!orgData) return null;

  const total = rows.reduce((s, e) => s + e.amount, 0);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Every cost your organization records, by category."
      >
        <Button variant="outline" render={<Link href="/expenses/categories" />}>
          <Tags className="size-4" />
          Categories
        </Button>
        {isAdmin && (
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add expense
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-52">
          <FormSelect
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: "ALL", label: "All categories" },
              ...orgData.categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {rows.length} expense{rows.length === 1 ? "" : "s"} ·{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(total)}
          </span>
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses here"
          description="Record your costs to see them flow into your profitability metrics."
          action={
            isAdmin ? (
              <Button onClick={openAdd}>
                <Plus className="size-4" />
                Add expense
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Recurrence</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => {
                const cat = categoryMap.get(e.categoryId);
                return (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(e.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: cat?.color ?? "var(--muted-foreground)" }}
                        />
                        <span className="text-foreground">
                          {cat?.name ?? "Uncategorized"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.description}
                    </TableCell>
                    <TableCell>
                      <RecurrenceBadge cadence={e.cadence} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(e.amount)}
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
                                setEditing(e);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleting(e)}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this expense?"
        description={
          deleting
            ? `${deleting.description} · ${formatCurrency(deleting.amount)}`
            : undefined
        }
        onConfirm={() => {
          if (deleting) dispatch({ type: "DELETE_EXPENSE", id: deleting.id });
        }}
      />
    </div>
  );
}
